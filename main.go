package main

import (
	"embed"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

//go:embed static/*
var staticFiles embed.FS

var (
	// HTTP request counter
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "status"},
	)

	// HTTP request duration histogram
	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request duration in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "path", "status"},
	)

	// Download counter (successful page loads)
	downloadsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "webacidizator_downloads_total",
			Help: "Total number of successful page downloads",
		},
	)

	// Error counter
	errorsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webacidizator_errors_total",
			Help: "Total number of errors",
		},
		[]string{"type"},
	)
)

// prometheusMiddleware wraps handlers to collect metrics
func prometheusMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create response writer wrapper to capture status code
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Call next handler
		next.ServeHTTP(rw, r)

		duration := time.Since(start).Seconds()
		status := http.StatusText(rw.statusCode)

		// Record metrics
		httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, status).Inc()
		httpRequestDuration.WithLabelValues(r.Method, r.URL.Path, status).Observe(duration)

		// Track successful downloads
		if r.URL.Path == "/" && rw.statusCode == http.StatusOK {
			downloadsTotal.Inc()
		}

		// Track errors
		if rw.statusCode >= 400 {
			errorsTotal.WithLabelValues("http_error").Inc()
		}
	})
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// healthHandler provides a health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	//nolint:errcheck
	w.Write([]byte(`{"status":"healthy"}`))
}

// indexHandler serves the main HTML page
func indexHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	data, err := staticFiles.ReadFile("static/index.html")
	if err != nil {
		log.Printf("Error reading index.html: %v", err)
		errorsTotal.WithLabelValues("file_read_error").Inc()
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	//nolint:errcheck
	w.Write(data)
}

func main() {
	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Setup routes
	mux := http.NewServeMux()

	// Main page
	mux.HandleFunc("/", indexHandler)

	// Health check
	mux.HandleFunc("/health", healthHandler)

	// Prometheus metrics
	mux.Handle("/metrics", promhttp.Handler())

	// Wrap with metrics middleware
	handler := prometheusMiddleware(mux)

	// Start server
	addr := ":" + port
	log.Printf("Starting WebAcidizator server on %s", addr)

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

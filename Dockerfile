FROM golang:alpine AS builder

WORKDIR /

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY *.go ./
COPY static/ /static/
#COPY internal/ internal/

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -trimpath -o webacidizator .

#####
FROM scratch

COPY static/ /static/
COPY --from=builder webacidizator /

ENTRYPOINT ["/webacidizator"]

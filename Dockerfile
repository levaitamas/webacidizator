FROM golang:alpine AS builder

WORKDIR /

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY *.go ./
# COPY static/ /static/
#COPY internal/ internal/

RUN mkdir static \
    && cd static \
    && wget https://raw.githubusercontent.com/levaitamas/webacidizator/refs/heads/main/index.html

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -trimpath -o webacidizator .

#####
FROM scratch

COPY static/ /static/
COPY --from=builder webacidizator /

ENTRYPOINT ["/webacidizator"]

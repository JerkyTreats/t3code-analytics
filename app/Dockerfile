FROM rust:1.95-bookworm AS builder
WORKDIR /build
COPY app/Cargo.toml app/Cargo.lock ./
RUN mkdir src && printf 'fn main() {}\n' > src/main.rs && cargo build --release && rm -rf src
COPY app/src ./src
COPY app/static ./static
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates libsqlite3-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /build/target/release/t3code-analytics /usr/local/bin/t3code-analytics
USER 1000:1000
EXPOSE 4180
ENTRYPOINT ["/usr/local/bin/t3code-analytics"]

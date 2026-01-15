FROM oven/bun:latest

ARG TARGETPLATFORM

WORKDIR /app

RUN echo "Building for $TARGETPLATFORM"

ENV TARGETPLATFORM=${TARGETPLATFORM}

COPY dist/binaries/quickdapp-linux-* /app/

RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
      cp /app/quickdapp-linux-x64 /app/quickdapp; \
    else \
      cp /app/quickdapp-linux-arm64 /app/quickdapp; \
    fi

RUN rm -rf /app/quickdapp-linux-*

RUN chmod +x /app/quickdapp

EXPOSE 3000

ENTRYPOINT ["./quickdapp"]

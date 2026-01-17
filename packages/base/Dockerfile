FROM oven/bun:latest

ARG TARGETPLATFORM

WORKDIR /app

RUN echo "Building for $TARGETPLATFORM"

# Set the platform environment variable
ENV TARGETPLATFORM=${TARGETPLATFORM}

# Copy all Linux binaries from the build output
COPY dist/binaries/quickdapp-linux-* /app/

# Select the correct binary for the target platform
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
      cp /app/quickdapp-linux-x64 /app/quickdapp; \
    else \
      cp /app/quickdapp-linux-arm64 /app/quickdapp; \
    fi

# Remove unused binaries to keep image size down
RUN rm -rf /app/quickdapp-linux-*

# Make the binary executable
RUN chmod +x /app/quickdapp

# Expose the application port
EXPOSE 3000

# Run the binary
ENTRYPOINT ["./quickdapp"]
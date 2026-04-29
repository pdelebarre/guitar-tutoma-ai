# Stage 1: Build the Spring Boot application
FROM maven:3.9-eclipse-temurin-25 AS build

WORKDIR /app

# Copy pom.xml first for dependency caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Run the application
FROM eclipse-temurin:25-jre-alpine

WORKDIR /app

# Install Python 3, pip, and build dependencies for faster-whisper
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-numpy \
    py3-setuptools \
    py3-wheel \
    gcc \
    g++ \
    musl-dev \
    linux-headers \
    python3-dev \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir faster-whisper \
    && rm -rf /root/.cache/pip

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Copy the subtitle generation script
COPY scripts/ ./scripts/

# Make sure the venv python is used
ENV PATH="/opt/venv/bin:$PATH"

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

# --------------------------------------------------------------
# Dockerfile for cloud‑native deployment (backend + static frontend)
# --------------------------------------------------------------
# 1️⃣ Build stage – compile Spring Boot app
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Cache Maven dependencies
COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline -B

# Copy source and build jar
COPY src ./src
RUN ./mvnw clean package -DskipTests

# --------------------------------------------------------------
# 2️⃣ Runtime stage – run the app and serve static files
# --------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the built jar
COPY --from=builder /app/target/*.jar app.jar

# Copy the compiled frontend (assumes you have built it into backend/src/main/resources/static)
# If you haven’t, copy the raw frontend folder here manually.
COPY --from=builder /app/src/main/resources/static ./src/main/resources/static

EXPOSE 8080

# Run as non‑root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

ENTRYPOINT ["java","-jar","app.jar"]

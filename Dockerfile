FROM node:20-alpine AS base

# 1. Зависимости
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Сборка
FROM base AS builder
WORKDIR /app

# Build arguments (только публичные переменные)
ARG NEXTAUTH_URL
ARG NEXT_PUBLIC_API_URL

# Environment для сборки
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# ⭐ Заглушки для NextAuth (минимум 32 символа)
ENV GITHUB_ID="Ov23liStubClientIdForBuildOnly"
ENV GITHUB_SECRET="stub_github_client_secret_for_build_time_only_32chars"
ENV GOOGLE_CLIENT_ID="123456789-stub_google_client_id_for_build.apps.googleusercontent.com"
ENV GOOGLE_CLIENT_SECRET="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_time"
ENV NEXTAUTH_SECRET="stub-nextauth-secret-minimum-32-characters-long-for-build-only-12345"

# ⭐ Заглушки для Firebase
ENV FIREBASE_PROJECT_ID="stub-project"
ENV FIREBASE_CLIENT_EMAIL="stub@stub.iam.gserviceaccount.com"
ENV FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj\nMzEfYyjiWA4R4/M2bS1+fWIcPm15j9M0XmaCXj3K\n-----END PRIVATE KEY-----"
ENV FIREBASE_DATABASE_URL="https://stub-project.firebaseio.com"

# ⭐ Заглушки для Yandex Cloud
ENV YC_FOLDER_ID
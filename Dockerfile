# Multi-stage build
# Stage 1: Build the Vite app
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime - serve static build with vite preview
# (vite preview respects base '/chit-chat/' from vite.config.ts)
FROM node:22-alpine AS runtime
WORKDIR /app
COPY package*.json ./
RUN npm ci
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]

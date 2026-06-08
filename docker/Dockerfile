FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
RUN npm ci && npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3141
CMD ["node", "packages/api/dist/server.js"]

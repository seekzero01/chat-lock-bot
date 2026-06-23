FROM oven/bun:1.3 AS builder
WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma

RUN bun install --frozen-lockfile

ENV DB__URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN bunx prisma generate

COPY . .

RUN bun run build

FROM oven/bun:1.3-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["bun", "run", "dist/main.js"]
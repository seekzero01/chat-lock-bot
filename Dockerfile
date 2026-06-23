FROM oven/bun:1.3 AS base
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY . .
RUN bun run nest build

EXPOSE 3000
CMD ["bun", "dist/main.js"]
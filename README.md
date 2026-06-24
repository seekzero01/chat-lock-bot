# ChatLock

> A Telegram bot that automatically enforces quiet hours in group chats — locking and unlocking members on a schedule you define, with per-chat timezone support.

## Overview

ChatLock lets group administrators define a daily time window during which regular members cannot send messages. When the window opens, the bot restricts the group using Telegram's native permissions API; when it closes, restrictions are lifted — all without any manual intervention. Each chat stores its own schedule and timezone, making the bot suitable for communities spread across different regions. State transitions use an optimistic `updateMany` mutex so that horizontal Railway replicas never double-fire the same lock/unlock action.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun 1.3 |
| Language | TypeScript 5.7 (strict) |
| Framework | NestJS 11 |
| HTTP adapter | Fastify (`@nestjs/platform-fastify`) |
| Build compiler | SWC (`@swc/core`) |
| Telegram client | nestjs-telegraf 2.9 + Telegraf 4.16 |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma 7 (driver adapter: `@prisma/adapter-pg`) |
| Concurrency control | `p-limit` |
| Scheduler | `@nestjs/schedule` (cron) |
| Deployment | Railway |

## Architecture

The application is a single NestJS process split into focused, decoupled modules. `BotModule` handles Telegram webhook ingestion, command routing, and admin access control via a guard that calls `getChatMember` on every protected command.

`ChatLockModule` contains the scheduling engine (`ChatLockScheduler`) and the data repository (`ChatLockService`). The scheduler evaluates state transitions every **15 seconds** using a highly performant **Delta Query pattern**. Instead of downloading the full table into application memory to evaluate date intervals, it shifts time logic entirely to the database layer via raw SQL (`$queryRaw`). By calculating normalized **Minutes Since Midnight** values ($(Hours \times 60) + Minutes$) against the target row's dynamic local timezone offset, PostgreSQL isolates and returns only the specific rows that are due for a state transition at that exact second. This natively supports both standard daytime windows and complex overnight schedule shifts (e.g., locking at 22:00 and unlocking at 06:00).

To process these changes without system starvation or rate violations, the scheduler feeds due transitions into a **Controlled Concurrency pipeline** managed by `p-limit`. Rather than looping sequentially (which introduces execution lag) or opening unbounded promises (which triggers Telegram flood drops), the task pool restricts active network I/O to a safe threshold of 15 parallel routines.

Distributed replica protection uses an optimistic `updateMany` mutex statement:

```typescript
prisma.chatLock.updateMany({
  where: { chatId, isLocked: <expected_state> },
  data: { isLocked: <target_state> },
})
```

Only the first horizontal replica instance to register the query wins the mutation count; competing instances read a return count of `0` and safely bypass making duplicate Telegram API calls.

Observability and debugging metrics are distributed via a transient-scoped `LoggerModule`. The logger automatically registers isolated class contexts for tracking signatures, printing colorized console lines in development and converting seamlessly into structured JSON log streams for cloud platforms like Railway.

Key modules:

- **`BotModule`** — `TelegrafModule` initialization, command handlers (`/start`, `/set`, `/status`, `/unlock`, `/help`), and `AdminGuard`
- **`ChatLockModule`** — `ChatLockService` (atomic operations & mutex validation) and `ChatLockScheduler` (15s cron engine, delta query, `p-limit` pipeline)
- **`DatabaseModule`** — `pg.Pool` connection layer and `DatabaseService`
- **`PrismaService`** — `PrismaClient` instantiated with the `@prisma/adapter-pg` serverless driver adapter
- **`LoggerModule`** — `AppLogger` extending `ConsoleLogger` for dual-mode output (colorized dev / structured JSON in production)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- A PostgreSQL database (Neon recommended)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- The bot must be added to your group and promoted to **Admin** with the **"Restrict members"** permission enabled

```bash
# Clone
git clone https://github.com/seekzero01/chat-lock-bot.git
cd chat-lock-bot

# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Apply migrations
bunx prisma migrate deploy

# Configure environment
cp .env.example .env
# Fill in TELEGRAM_BOT_TOKEN and DATABASE_URL

# Run in development (long-polling)
bun run start:dev

# Run in production
bun run start:prod
```

### Docker

```bash
docker build -t chat-lock-bot .
docker run -p 3000:3000 \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -e DATABASE_URL=your_connection_string \
  chat-lock-bot
```

### Railway Deployment

Push to your Railway project — it detects the `bun` runtime from the `Dockerfile` automatically. Set the environment variables in the Railway dashboard. The service listens on `PORT` (defaults to `3000`).

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather | ✅ |
| `DATABASE_URL` | PostgreSQL connection string (Neon or standard) | ✅ |
| `PORT` | HTTP server port (defaults to `3000`) | ☑️ optional |

## Bot Commands

| Command | Access | Description |
|---|---|---|
| `/start` | Everyone | Introduction message and quick-start guide |
| `/help` | Everyone | Full command reference |
| `/set <lock> <unlock> [timezone]` | Admins only | Set quiet hours. Times in `HH:MM` (24h). Timezone is an IANA identifier, defaults to `UTC`. Example: `/set 22:00 06:00 Europe/Helsinki` |
| `/status` | Admins only | Show active schedule, current lock state, and live local time |
| `/unlock` | Admins only | Remove the schedule and immediately restore all chat permissions |

> `/set` overwrites any existing schedule — use `/unlock` first if you need to reconfigure.

## Contributing

1. Fork the repo and create a feature branch: `git switch -c feat/my-feature`
2. Make your changes
3. Ensure `bun run lint` passes before opening a PR
4. Open a pull request with a clear description

## License

UNLICENSED — private repository.
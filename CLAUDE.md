# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Install Dependencies:** `bun install`
- **Development:** `bun run start:dev` (runs in watch mode)
- **Production:** `bun run start:prod`
- **Unit Tests:** `bun run test`
- **E2E Tests:** `bun run test:e2e`

## Architecture Overview

ChatLock is a Telegram automation bot built using the **NestJS** framework and **Telegraf**. 

- **Entry Point:** The application starts in `src/main.ts`.
- **Core Modules:**
  - `BotModule`: Encapsulates all logic related to Telegram bot interactions.
  - `DatabaseModule`: Handles database connectivity, integrated with **Prisma ORM**.
- **Data Layer:** Schema definitions are located in `prisma/schema.prisma`. Prisma client is used for database interactions throughout the service layer.
- **Scheduling:** The application utilizes the NestJS Schedule module for cron-based automation tasks.

The project is configured for continuous deployment on the **Railway** platform, using a PostgreSQL database provisioned via **Neon**.

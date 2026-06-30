import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ChatLock } from '../generated/prisma/client';
import { AppLogger } from '../logger/app-logger.service';
import { CreateLockDto } from './dto/create-lock.dto';
import { isPrismaClientExceptionWithCode } from '../common/utils/prisma-error.util';
import { ScheduleConflictError } from '../common/errors/schedule-conflict.error';
import { ScheduleNotFoundError } from '../common/errors/schedule-not-found.error';

@Injectable()
export class ChatLockService {
  constructor(
    private readonly logger: AppLogger,
    private readonly prisma: PrismaService,
  ) {
    this.logger.setContext(ChatLockService.name);
  }

  async createLock(dto: CreateLockDto): Promise<ChatLock> {
    try {
      return await this.prisma.chatLock.create({ data: dto });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to create schedule for chat ${dto.chatId}`,
        error instanceof Error ? error.stack : error,
      );

      if (isPrismaClientExceptionWithCode(error, 'P2002')) {
        throw new ScheduleConflictError(dto.chatId);
      }
      throw error;
    }
  }

  async removeLock(chatId: string): Promise<ChatLock> {
    try {
      return await this.prisma.chatLock.delete({ where: { chatId } });
    } catch (error) {
      this.logger.error(
        `Failed to drop schedule registry for chat ${chatId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (isPrismaClientExceptionWithCode(error, 'P2025')) {
        throw new ScheduleNotFoundError(chatId);
      }
      throw error;
    }
  }

  async findLock(chatId: string): Promise<ChatLock> {
    try {
      const lock = await this.prisma.chatLock.findUnique({ where: { chatId } });

      if (!lock) {
        this.logger.warn(
          `Schedule lookup failed: No database record exists for chat ${chatId}`,
        );
        throw new ScheduleNotFoundError(chatId);
      }

      return lock;
    } catch (error: unknown) {
      if (!(error instanceof ScheduleNotFoundError)) {
        this.logger.error(
          `Database adapter exception during lookup on chat: ${chatId}`,
          error instanceof Error ? error.stack : error,
        );
      }
      throw error;
    }
  }

  async findPendingLocks(): Promise<ChatLock[]> {
    try {
      return await this.prisma.$queryRaw<ChatLock[]>`
            SELECT * FROM "ChatLock"
            WHERE "isLocked" = false
              AND (
                -- Case A: Standard daytime window (e.g., 11:25 to 11:30)
                (
                    ("lockHour" * 60 + "lockMinute") < ("unlockHour" * 60 + "unlockMinute")
                        AND (EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int * 60 + EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int) >= ("lockHour" * 60 + "lockMinute")
                        AND (EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int * 60 + EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int) < ("unlockHour" * 60 + "unlockMinute")
                    )
                    OR
                    -- Case B: Overnight window (e.g., 22:00 to 06:00)
                (
                    ("lockHour" * 60 + "lockMinute") > ("unlockHour" * 60 + "unlockMinute")
                        AND (
                        (EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int * 60 + EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int) >= ("lockHour" * 60 + "lockMinute")
                            OR (EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int * 60 + EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int) < ("unlockHour" * 60 + "unlockMinute")
                        )
                    )
                )
        `;
    } catch (error: unknown) {
      this.logger.error(
        'Database query processing failure during findPendingLocks pipeline evaluation',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async findPendingUnlocks(): Promise<ChatLock[]> {
    try {
      return await this.prisma.$queryRaw<ChatLock[]>`
            SELECT * FROM "ChatLock"
            WHERE "isLocked" = true
              AND NOT (
                -- Case A: Standard daytime window
                (
                    ("lockHour" * 60 + "lockMinute") < ("unlockHour" * 60 + "unlockMinute")
                        AND (EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int * 60 + EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int) >= ("lockHour" * 60 + "lockMinute")
                        AND (EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int * 60 + EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int) < ("unlockHour" * 60 + "unlockMinute")
                    )
                    OR
                    -- Case B: Overnight window
                (
                    ("lockHour" * 60 + "lockMinute") > ("unlockHour" * 60 + "unlockMinute")
                        AND (
                        (EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int * 60 + EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int) >= ("lockHour" * 60 + "lockMinute")
                            OR (EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int * 60 + EXTRACT(MINUTE FROM (CURRENT_TIMESTAMP AT TIME ZONE "timezone"))::int) < ("unlockHour" * 60 + "unlockMinute")
                        )
                    )
                )
        `;
    } catch (error: unknown) {
      this.logger.error(
        'Database query processing failure during findPendingUnlocks pipeline evaluation',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async tryTransitionToLocked(chatId: string): Promise<boolean> {
    try {
      const result = await this.prisma.chatLock.updateMany({
        where: { chatId, isLocked: false },
        data: { isLocked: true, lockedAt: new Date() },
      });
      const success = result.count > 0;
      if (success) {
        this.logger.log(
          `Mutex Claimed: Chat ${chatId} locked successfully in database.`,
        );
      } else {
        this.logger.warn(
          `Mutex Skipped: Chat ${chatId} state change was already captured by another execution node replica.`,
        );
      }
      return success;
    } catch (error: unknown) {
      this.logger.error(
        `Critical exception during mutate claim tryTransitionToLocked for chat ${chatId}`,
        error instanceof Error ? error.stack : error,
      );
      return false;
    }
  }

  async tryTransitionToUnlocked(chatId: string): Promise<boolean> {
    try {
      const result = await this.prisma.chatLock.updateMany({
        where: { chatId, isLocked: true },
        data: { isLocked: false, lockedAt: new Date() },
      });
      const success = result.count > 0;
      if (success) {
        this.logger.log(
          `Mutex Claimed: Chat ${chatId} unlocked safely in database layer.`,
        );
      } else {
        this.logger.warn(
          `Mutex Skipped: Chat ${chatId} transition concurrently written by another node.`,
        );
      }
      return success;
    } catch (error: unknown) {
      this.logger.error(
        `Critical exception during mutate claim tryTransitionToUnlocked for chat ${chatId}`,
        error instanceof Error ? error.stack : error,
      );
      return false;
    }
  }
}

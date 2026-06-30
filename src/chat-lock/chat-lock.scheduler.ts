import { BeforeApplicationShutdown, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Telegraf, Context } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { ChatLockService } from './chat-lock.service';
import pLimit from 'p-limit';
import { AppLogger } from '../logger/app-logger.service';
import { ChatLock } from '../generated/prisma/client';

@Injectable()
export class ChatLockScheduler implements BeforeApplicationShutdown {
  private readonly telegramRateLimiter = pLimit(15);

  constructor(
    private readonly logger: AppLogger,
    private readonly chatLockService: ChatLockService,
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {
    this.logger.setContext(ChatLockScheduler.name);
  }

  async beforeApplicationShutdown(signal?: string) {
    this.logger.log(
      `Shutdown signal [${signal}] caught. Cleaning up scheduler queue...`,
    );

    if (
      this.telegramRateLimiter.activeCount > 0 ||
      this.telegramRateLimiter.pendingCount > 0
    ) {
      this.logger.warn(
        `Waiting for ${this.telegramRateLimiter.activeCount} active operational tasks to complete...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  @Cron('*/15 * * * * *')
  async evaluateLocks() {
    try {
      const [pendingLocks, pendingUnlocks] = await Promise.all([
        this.chatLockService.findPendingLocks(),
        this.chatLockService.findPendingUnlocks(),
      ]);

      const lockTasks = pendingLocks.map((lock) =>
        this.telegramRateLimiter(() => this.executeLockTransition(lock)),
      );

      const unlockTasks = pendingUnlocks.map((lock) =>
        this.telegramRateLimiter(() => this.executeUnlockTransition(lock)),
      );

      await Promise.allSettled([...lockTasks, ...unlockTasks]);
    } catch (error: unknown) {
      this.logger.error(
        'Critical exception encountered during cron execution matching lifecycle step',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async executeLockTransition(lock: ChatLock) {
    const claimed = await this.chatLockService.tryTransitionToLocked(
      lock.chatId,
    );
    if (!claimed) return;

    try {
      await this.bot.telegram.setChatPermissions(lock.chatId, {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Telegram API lock application failed for chat ${lock.chatId}. Initiating rollback logic...`,
        error instanceof Error ? error.stack : error,
      );

      try {
        await this.chatLockService.tryTransitionToUnlocked(lock.chatId);
      } catch (rollbackError: unknown) {
        this.logger.error(
          `Fatal: Compensating rollback sequence failed for chat entry: ${lock.chatId}`,
          rollbackError instanceof Error ? rollbackError.stack : rollbackError,
        );
      }
    }
  }

  private async executeUnlockTransition(lock: ChatLock) {
    const claimed = await this.chatLockService.tryTransitionToUnlocked(
      lock.chatId,
    );
    if (!claimed) return;

    try {
      await this.bot.telegram.setChatPermissions(lock.chatId, {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      });
    } catch (error) {
      this.logger.error(
        `Telegram API unlock application failed for chat ${lock.chatId}. Initiating rollback logic...`,
        error instanceof Error ? error.stack : String(error),
      );

      try {
        await this.chatLockService.tryTransitionToLocked(lock.chatId);
      } catch (rollbackError: unknown) {
        this.logger.error(
          `Fatal: Compensating rollback sequence failed for chat entry: ${lock.chatId}`,
          rollbackError instanceof Error ? rollbackError.stack : rollbackError,
        );
      }
    }
  }
}

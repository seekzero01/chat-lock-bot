import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { ChatLockService } from '../../chat-lock/chat-lock.service';
import { AppLogger } from '../../logger/app-logger.service';
import { ScheduleNotFoundError } from '../../common/errors/schedule-not-found.error';

@Injectable()
export class UnlockHandler {
  constructor(
    private readonly logger: AppLogger,
    private readonly chatLockService: ChatLockService,
  ) {
    this.logger.setContext(UnlockHandler.name);
  }

  async handle(ctx: Context) {
    const chatId = String(ctx.chat!.id);

    try {
      await this.chatLockService.removeLock(chatId);

      await ctx.telegram.setChatPermissions(chatId, {
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

      await ctx.reply('Schedule removed and chat permissions restored.');
    } catch (error: unknown) {
      if (error instanceof ScheduleNotFoundError) {
        await ctx.reply('No active schedule found for this chat.');
        return;
      }

      if (error && typeof error === 'object' && 'description' in error) {
        const telegramError = error as { description: string };
        this.logger.warn(
          `Telegram Gateway restriction mismatch for chatId ${chatId}: ${telegramError.description}`,
        );
        await ctx.reply(
          `Schedule deleted internally, but failed to reset chat permissions: ${telegramError.description}. Please verify bot admin flags.`,
        );
        return;
      }

      this.logger.error(
        `Critical infrastructure fault during unlock sequence on chatId: ${chatId}`,
        error instanceof Error ? error.stack : error,
      );
      await ctx.reply(
        'An unexpected internal error occurred while executing the unlock workflow.',
      );
    }
  }
}

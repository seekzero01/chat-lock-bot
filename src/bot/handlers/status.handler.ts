import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { ChatLockService } from '../../chat-lock/chat-lock.service';
import { AppLogger } from '../../logger/app-logger.service';
import { formatTime } from '../../common/utils/time.util';
import { ScheduleNotFoundError } from '../../common/errors/schedule-not-found.error';

@Injectable()
export class StatusHandler {
  private readonly logger: AppLogger;

  constructor(private readonly chatLockService: ChatLockService) {
    this.logger.setContext(StatusHandler.name);
  }

  async handle(ctx: Context) {
    if (!ctx.chat) {
      await ctx.reply(
        'This command can only be executed within a Telegram Group.',
      );
      return;
    }

    const chatId = String(ctx.chat.id);

    try {
      const lock = await this.chatLockService.findLock(chatId);

      const lockTime = formatTime(lock.lockHour, lock.lockMinute);
      const unlockTime = formatTime(lock.unlockHour, lock.unlockMinute);

      const currentZoneTime = new Date().toLocaleTimeString('en-GB', {
        timeZone: lock.timezone,
        hour: '2-digit',
        minute: '2-digit',
      });

      const statusBadge = lock.isLocked
        ? '🔒 <b>Locked</b>'
        : '🔓 <b>Active (Accepting Messages)</b>';

      const responseMessage = [
        `<b>⚙️ Chat Lock Status</b>`,
        `────────────────────`,
        `• <b>Current State:</b> ${statusBadge}`,
        `• <b>Quiet Hours:</b> <code>${lockTime}</code> — <code>${unlockTime}</code>`,
        `• <b>Group Timezone:</b> <code>${lock.timezone}</code>`,
        `• <b>Current Time (${lock.timezone}):</b> <code>${currentZoneTime}</code>`,
      ].join('\n');

      await ctx.reply(responseMessage, { parse_mode: 'HTML' });
    } catch (error: unknown) {
      if (error instanceof ScheduleNotFoundError) {
        await ctx.reply(
          '❌ <b>No active restriction schedule found for this chat.</b>\nUse <code>/lock</code> to establish a new timeline restriction.',
          { parse_mode: 'HTML' },
        );
        return;
      }

      this.logger.error(
        `Failed to retrieve system status for chatId: ${chatId}`,
        error instanceof Error ? error.stack : error,
      );

      await ctx.reply(
        '❌ <b>Internal Server Error.</b>\nCould not fetch current schedule configuration. Please try again later.',
        { parse_mode: 'HTML' },
      );
    }
  }
}

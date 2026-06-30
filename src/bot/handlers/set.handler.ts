import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { ChatLockService } from '../../chat-lock/chat-lock.service';
import { formatTime, parseTimeArg } from '../../common/utils/time.util';
import { AppLogger } from '../../logger/app-logger.service';
import { ScheduleConflictError } from '../../common/errors/schedule-conflict.error';

@Injectable()
export class SetHandler {
  private readonly logger: AppLogger;

  constructor(private readonly chatLockService: ChatLockService) {
    this.logger.setContext(SetHandler.name);
  }

  async handle(ctx: Context, args: string[]) {
    if (args.length < 2) {
      await ctx.reply(
        'Usage: /set 22:00 06:00 [timezone]\nExample: /set 22:00 06:00 Europe/Helsinki',
      );
      return;
    }

    const lockTime = parseTimeArg(args[0]);
    const unlockTime = parseTimeArg(args[1]);

    if (!lockTime || !unlockTime) {
      await ctx.reply('Invalid time format. Use HH:MM, e.g. /set 22:00 06:00');
      return;
    }

    const timezone = args[2] ?? 'UTC';

    try {
      Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      await ctx.reply(
        `Unknown timezone: "${timezone}". Use IANA format, e.g. Europe/Helsinki`,
      );
      return;
    }

    const chatId = String(ctx.chat!.id);
    const chatTitle = 'title' in ctx.chat! ? ctx.chat.title : undefined;

    try {
      await this.chatLockService.createLock({
        chatId,
        chatTitle,
        lockHour: lockTime.hour,
        lockMinute: lockTime.minute,
        unlockHour: unlockTime.hour,
        unlockMinute: unlockTime.minute,
        timezone,
        createdBy: BigInt(ctx.from!.id),
      });

      const lock = formatTime(lockTime.hour, lockTime.minute);
      const unlock = formatTime(unlockTime.hour, unlockTime.minute);

      await ctx.reply(`Schedule set: 🔒 ${lock} → 🔓 ${unlock} (${timezone})`);
    } catch (error: unknown) {
      if (error instanceof ScheduleConflictError) {
        this.logger.warn(
          `Schedule validation conflict for chatId: ${error.chatId}`,
        );
        await ctx.reply(
          'A schedule already exists for this chat. Use /unlock to remove it first.',
        );
        return;
      }

      this.logger.error(
        `Failed to initialize chat lock schedule for chatId: ${chatId}`,
        error instanceof Error ? error.stack : error,
      );

      await ctx.reply(
        'An unexpected internal error occurred while saving your configuration. Please try again later.',
      );
    }
  }
}

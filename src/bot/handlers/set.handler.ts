import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { ChatLockService } from '../../chat-lock/chat-lock.service';
import { parseTimeArg } from '../../common/utils/time.util';

@Injectable()
export class SetHandler {
    constructor(private readonly chatLockService: ChatLockService) {}

    async handle(ctx: Context, args: string[]) {
        if (args.length < 2) {
            await ctx.reply('Usage: /set 22:00 06:00 [timezone]\nExample: /set 22:00 06:00 Europe/Helsinki');
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
            await ctx.reply(`Unknown timezone: "${timezone}". Use IANA format, e.g. Europe/Helsinki`);
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

            const fmt = (h: number, m: number) =>
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

            await ctx.reply(
                `Schedule set: 🔒 ${fmt(lockTime.hour, lockTime.minute)} → 🔓 ${fmt(unlockTime.hour, unlockTime.minute)} (${timezone})`,
            );
        } catch (error) {
            if (error.status === 409 || error.message?.includes('already exists')) {
                await ctx.reply('A schedule already exists for this chat. Use /unlock to remove it first.');
            } else {
                await ctx.reply('Failed to save schedule. Please try again.');
            }
        }
    }
}
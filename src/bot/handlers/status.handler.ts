import {Injectable, NotFoundException} from '@nestjs/common';
import { Context } from 'telegraf';
import {ChatLockService} from "../../chat-lock/chat-lock.service";

@Injectable()
export class StatusHandler {
    constructor(private readonly chatLockService: ChatLockService) {}

    async handle(ctx: Context) {
        if (!ctx.chat) {
            await ctx.reply('This command can only be executed within a Telegram Group.');
            return;
        }

        const chatId = String(ctx.chat.id);

        try {
            const lock = await this.chatLockService.findLock(chatId);

            const padTime = (hour: number, minute: number): string => {
                return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            };

            const lockTime = padTime(lock.lockHour, lock.lockMinute);
            const unlockTime = padTime(lock.unlockHour, lock.unlockMinute);

            const currentZoneTime = new Date().toLocaleTimeString('en-GB', {
                timeZone: lock.timezone,
                hour: '2-digit',
                minute: '2-digit',
            });

            const statusBadge = lock.isLocked ? '🔒 <b>Locked</b>' : '🔓 <b>Active (Accepting Messages)</b>';

            const responseMessage = [
                `<b>⚙️ Chat Lock Status</b>`,
                `────────────────────`,
                `• <b>Current State:</b> ${statusBadge}`,
                `• <b>Quiet Hours:</b> <code>${lockTime}</code> — <code>${unlockTime}</code>`,
                `• <b>Group Timezone:</b> <code>${lock.timezone}</code>`,
                `• <b>Current Time (${lock.timezone}):</b> <code>${currentZoneTime}</code>`,
            ].join('\n');

            await ctx.reply(responseMessage, { parse_mode: 'HTML' });
        } catch (error) {
            if (error instanceof NotFoundException || error.status === 404) {
                await ctx.reply(
                    '❌ <b>No active restriction schedule found for this chat.</b>\nUse <code>/lock</code> to establish a new timeline restriction.',
                    { parse_mode: 'HTML' }
                );
            } else {
                await ctx.reply('⚠️ Failed to retrieve chat configurations. Please try again later.');
            }
        }
    }
}
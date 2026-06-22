import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';
import { ChatLockService } from '../../chat-lock/chat-lock.service';

@Injectable()
export class UnlockHandler {
    constructor(private readonly chatLockService: ChatLockService) {}

    async handle(ctx: Context) {
        const chatId = String(ctx.chat!.id);

        try {
            await this.chatLockService.removeLock(chatId);

            await ctx.telegram.setChatPermissions(chatId, {
                can_send_messages: true,
                can_send_polls: true,
                can_send_other_messages: true,
                can_add_web_page_previews: true,
            });

            await ctx.reply('Schedule removed and chat permissions restored.');
        } catch (error) {
            if (error.status === 404 || error.message?.includes('No schedule found')) {
                await ctx.reply('No active schedule found for this chat.');
            } else {
                await ctx.reply('Failed to remove schedule. Please try again.');
            }
        }
    }
}
import { Injectable } from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import { Telegraf, Context } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { ChatLockService } from './chat-lock.service';
import { shouldBeLocked } from '../common/utils/time.util';

@Injectable()
export class ChatLockScheduler {
    constructor(
        private readonly chatLockService: ChatLockService,
        @InjectBot() private readonly bot: Telegraf<Context>,
    ) {}

    @Cron('*/15 * * * * *')
    async evaluateLocks() {
        const locks = await this.chatLockService.findAll();

        for (const lock of locks) {
            const needsLock = shouldBeLocked(
                lock.lockHour,
                lock.lockMinute,
                lock.unlockHour,
                lock.unlockMinute,
                lock.timezone,
            );

            if (needsLock && !lock.isLocked) {
                const claimed = await this.chatLockService.tryTransitionToLocked(lock.chatId);
                if (!claimed) continue;

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
                } catch (error) {
                    await this.chatLockService.tryTransitionToUnlocked(lock.chatId);
                }
            }

            if (!needsLock && lock.isLocked) {
                const claimed = await this.chatLockService.tryTransitionToUnlocked(lock.chatId);
                if (!claimed) continue;

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
                    await this.chatLockService.tryTransitionToLocked(lock.chatId);
                }
            }
        }
    }
}
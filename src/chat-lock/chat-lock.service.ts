import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {ChatLock} from "../generated/prisma/client";
import {AppLogger} from "../logger/app-logger.service";

export interface CreateLockDto {
    chatId: string;
    chatTitle?: string;
    lockHour: number;
    lockMinute: number;
    unlockHour: number;
    unlockMinute: number;
    timezone: string;
    createdBy: bigint;
}

@Injectable()
export class ChatLockService {
    constructor(
        private readonly logger: AppLogger,
        private readonly prisma: PrismaService
    ) {
        this.logger.setContext(ChatLockService.name);
    }

    async createLock(dto: CreateLockDto) {
        try {
            return await this.prisma.chatLock.create({ data: dto });
        } catch (error) {
            this.logger.error(`Failed to create schedule for chat ${dto.chatId}`, error.stack);
            if (error.code === 'P2002') {
                throw new ConflictException('A schedule already exists for this chat.');
            }
            throw error;
        }
    }

    async removeLock(chatId: string) {
        try {
            return await this.prisma.chatLock.delete({ where: { chatId } });
        } catch (error) {
            this.logger.error(`Failed to drop schedule registry for chat ${chatId}`, error.stack);
            if (error.code === 'P2025') {
                throw new NotFoundException('No schedule found for this chat.');
            }
            throw error;
        }
    }

    async findPendingLocks(): Promise<ChatLock[]> {
        try {
            return this.prisma.$queryRaw<ChatLock[]>`
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
        } catch (error) {
            this.logger.error('Database connection breakdown or syntax failure inside raw findPendingLocks delta loop', error.stack);
            throw error;
        }
    }

    async findPendingUnlocks(): Promise<ChatLock[]> {
        try {
            return this.prisma.$queryRaw<ChatLock[]>`
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
        } catch (error) {
            this.logger.error('Database connection breakdown or syntax failure inside raw findPendingUnlocks delta loop', error.stack);
            throw error;
        }
    }

    async tryTransitionToLocked(chatId: string): Promise<boolean> {
        const result = await this.prisma.chatLock.updateMany({
            where: { chatId, isLocked: false },
            data: { isLocked: true, lockedAt: new Date() },
        });
        const success = result.count > 0;
        if (success) {
            this.logger.log(`Mutex Claimed: Chat ${chatId} locked successfully in database.`);
        } else {
            this.logger.warn(`Mutex Skipped: Chat ${chatId} state change was already captured by another execution node replica.`);
        }
        return success;
    }

    async tryTransitionToUnlocked(chatId: string): Promise<boolean> {
        const result = await this.prisma.chatLock.updateMany({
            where: { chatId, isLocked: true },
            data: { isLocked: false, lockedAt: new Date() },
        });
        const success = result.count > 0;
        if (success) {
            this.logger.log(`Mutex Claimed: Chat ${chatId} unlocked successfully in database.`);
        } else {
            this.logger.warn(`Mutex Skipped: Chat ${chatId} state change was already captured by another execution node replica.`);
        }
        return success;
    }
}
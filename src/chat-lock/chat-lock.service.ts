import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
    constructor(private readonly prisma: PrismaService) {}

    async createLock(dto: CreateLockDto) {
        try {
            return await this.prisma.chatLock.create({ data: dto });
        } catch (error) {
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
            if (error.code === 'P2025') {
                throw new NotFoundException('No schedule found for this chat.');
            }
            throw error;
        }
    }

    async findAll() {
        return this.prisma.chatLock.findMany();
    }

    async tryTransitionToLocked(chatId: string): Promise<boolean> {
        const result = await this.prisma.chatLock.updateMany({
            where: { chatId, isLocked: false },
            data: { isLocked: true, lockedAt: new Date() },
        });
        return result.count > 0;
    }

    async tryTransitionToUnlocked(chatId: string): Promise<boolean> {
        const result = await this.prisma.chatLock.updateMany({
            where: { chatId, isLocked: true },
            data: { isLocked: false, lockedAt: new Date() },
        });
        return result.count > 0;
    }
}
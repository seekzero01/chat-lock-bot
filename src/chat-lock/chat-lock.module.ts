import { Module } from '@nestjs/common';
import { ChatLockService } from './chat-lock.service';
import { ChatLockScheduler } from './chat-lock.scheduler';
import { PrismaService } from '../prisma.service';

@Module({
    providers: [ChatLockService, ChatLockScheduler, PrismaService],
    exports: [ChatLockService],
})
export class ChatLockModule {}
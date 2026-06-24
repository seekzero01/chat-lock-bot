import { Module } from '@nestjs/common';
import { ChatLockService } from './chat-lock.service';
import { ChatLockScheduler } from './chat-lock.scheduler';
import { PrismaService } from '../prisma.service';
import {AppLogger} from "../logger/app-logger.service";

@Module({
    providers: [ChatLockService, ChatLockScheduler, PrismaService, AppLogger],
    exports: [ChatLockService],
})
export class ChatLockModule {}
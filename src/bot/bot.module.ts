import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { SetHandler } from './handlers/set.handler';
import { UnlockHandler } from './handlers/unlock.handler';
import { AdminGuard } from './guards/admin.guard';
import { ChatLockModule } from '../chat-lock/chat-lock.module';
import { StartHandler } from './handlers/start.handler';
import { HelpHandler } from './handlers/help.handler';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { StatusHandler } from './handlers/status.handler';
import { AppLogger } from '../logger/app-logger.service';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: process.env.TELEGRAM_BOT_TOKEN as string,
      middlewares: [session()],
    }),
    ChatLockModule,
  ],
  providers: [
    BotUpdate,
    StatusHandler,
    StartHandler,
    HelpHandler,
    SetHandler,
    UnlockHandler,
    AdminGuard,
    AppLogger,
  ],
})
export class BotModule {}

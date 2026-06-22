import { Module } from '@nestjs/common';
import {DatabaseModule} from "./database/database.module";
import {ConfigModule} from "@nestjs/config";
import {BotModule} from "./bot/bot.module";
import {ScheduleModule} from "@nestjs/schedule";

@Module({
  imports: [
      ConfigModule.forRoot({
          envFilePath: '.env',
      }),
      DatabaseModule,
      ScheduleModule.forRoot(),
      BotModule,
  ],
})
export class AppModule {}

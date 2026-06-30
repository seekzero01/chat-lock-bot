import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';

@Injectable()
export class StartHandler {
  async handle(ctx: Context) {
    await ctx.reply(
      `Hi 👋\n\nI automatically lock and unlock Telegram group chats on a schedule you define.\n\nAdd me to a group, make me an admin with permission to restrict members, then use /set to configure a schedule.\n\nType /help to see all available commands.`,
    );
  }
}

import { Update, Command, Start, Help } from 'nestjs-telegraf';
import { UseGuards } from '@nestjs/common';
import { Context } from 'telegraf';
import { AdminGuard } from './guards/admin.guard';
import { SetHandler } from './handlers/set.handler';
import { UnlockHandler } from './handlers/unlock.handler';
import { StartHandler } from './handlers/start.handler';
import { HelpHandler } from './handlers/help.handler';
import { StatusHandler } from './handlers/status.handler';

@Update()
export class BotUpdate {
  constructor(
    private readonly startHandler: StartHandler,
    private readonly statusHandler: StatusHandler,
    private readonly helpHandler: HelpHandler,
    private readonly setHandler: SetHandler,
    private readonly unlockHandler: UnlockHandler,
  ) {}

  @Start()
  async onStart(ctx: Context) {
    await this.startHandler.handle(ctx);
  }

  @Help()
  async onHelp(ctx: Context) {
    await this.helpHandler.handle(ctx);
  }

  @Command('set')
  @UseGuards(AdminGuard)
  async onSet(ctx: Context) {
    const text = 'text' in ctx.message! ? ctx.message.text : '';
    const args = text.trim().split(/\s+/).slice(1);
    await this.setHandler.handle(ctx, args);
  }

  @Command('unlock')
  @UseGuards(AdminGuard)
  async onUnlock(ctx: Context) {
    await this.unlockHandler.handle(ctx);
  }

  @Command('status')
  @UseGuards(AdminGuard)
  async onStatus(ctx: Context) {
    await this.statusHandler.handle(ctx);
  }
}

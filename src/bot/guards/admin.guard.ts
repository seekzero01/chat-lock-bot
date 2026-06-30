import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UserType, userTypes } from '../types';

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const telegrafExecutionContext =
      TelegrafExecutionContext.create(executionContext);
    const ctx = telegrafExecutionContext.getContext<Context>();

    if (!ctx.chat || !ctx.from) {
      return false;
    }

    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
      return userTypes.includes(member.status as UserType);
    } catch {
      return false;
    }
  }
}

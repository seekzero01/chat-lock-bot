import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';

@Injectable()
export class HelpHandler {
    async handle(ctx: Context) {
        await ctx.reply(
            `Available commands:\n\n` +
            `/set <lock> <unlock> [timezone] — set a lock schedule\n` +
            `Example: /set 22:00 06:00 Europe/Helsinki\n\n` +
            `/unlock — remove the schedule and restore chat permissions immediately\n\n` +
            `/help — show this message\n\n` +
            `Notes:\n` +
            `• Times are in 24h format (HH:MM)\n` +
            `• Timezone must be a valid IANA name (e.g. Europe/Helsinki, UTC, America/New_York)\n` +
            `• Only group admins can use these commands\n` +
            `• The bot must be an admin with "Restrict members" permission`,
        );
    }
}
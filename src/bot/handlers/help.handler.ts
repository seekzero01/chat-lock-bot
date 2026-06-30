import { Injectable } from '@nestjs/common';
import { Context } from 'telegraf';

@Injectable()
export class HelpHandler {
  async handle(ctx: Context) {
    const helpMessage = [
      `<b>🛠️ ChatLock — Available Commands</b>`,
      `────────────────────────`,
      `💾 <code>/set &lt;lock&gt; &lt;unlock&gt; [timezone]</code>`,
      `Establish a recurring quiet hours lock window.`,
      `<i>Example:</i> <code>/set 22:00 06:00 Europe/Helsinki</code>`,
      ``,
      `📊 <code>/status</code>`,
      `View the active schedule configurations, current state, and live time in the group's timezone.`,
      ``,
      `🔓 <code>/unlock</code>`,
      `Permanently wipe the schedule constraints and instantly restore chat permissions.`,
      ``,
      `ℹ️ <code>/help</code>`,
      `Display this command menu.`,
      `────────────────────────`,
      `<b>💡 Important Guidelines:</b>`,
      `• Execution times must strictly follow the 24h format (<code>HH:MM</code>).`,
      `• The optional timezone parameter must be a valid IANA identifier (e.g., <code>Europe/Helsinki</code>, <code>UTC</code>). Defaults to UTC if omitted.`,
      `• These structural controls are heavily guarded; only group administrators can run them.`,
      `• Ensure ChatLock has been elevated to an Admin role inside this group with explicit <b>"Restrict members"</b> permissions enabled.`,
    ].join('\n');

    await ctx.reply(helpMessage, { parse_mode: 'HTML' });
  }
}

import { Injectable, Scope, ConsoleLogger } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
    constructor() {
        super('', {
            json: process.env.NODE_ENV === 'production',
            timestamp: process.env.NODE_ENV !== 'production',
            colors: process.env.NODE_ENV !== 'production',
        });
    }
    
    logTelegramAction(chatId: string, action: 'LOCK' | 'UNLOCK', durationMs?: number) {
        const message = `[Telegram API] Target action ${action} executed successfully for chat ${chatId}`;
        this.log(durationMs ? `${message} (${durationMs}ms)` : message);
    }
}
export const shouldBeLocked = (
    lockHour: number,
    lockMinute: number,
    unlockHour: number,
    unlockMinute: number,
    timezone: string,
): boolean => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')!.value, 10);

    const current = currentHour * 60 + currentMinute;
    const lock = lockHour * 60 + lockMinute;
    const unlock = unlockHour * 60 + unlockMinute;

    if (lock > unlock) {
        return current >= lock || current < unlock;
    }

    return current >= lock && current < unlock;
}

export const parseTimeArg = (raw: string): { hour: number; minute: number } | null => {
    const parts = raw.split(':');
    if (parts.length !== 2) return null;

    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }

    return { hour, minute };
}
export interface CreateLockDto {
  chatId: string;
  chatTitle?: string;
  lockHour: number;
  lockMinute: number;
  unlockHour: number;
  unlockMinute: number;
  timezone: string;
  createdBy: bigint;
}

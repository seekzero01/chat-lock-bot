export class ScheduleConflictError extends Error {
  constructor(
    public readonly chatId: string,
    message: string = 'A scheduling configuration conflict occurred.',
  ) {
    super(message);
    this.name = 'ScheduleConflictError';
    Object.setPrototypeOf(this, ScheduleConflictError.prototype);
  }
}

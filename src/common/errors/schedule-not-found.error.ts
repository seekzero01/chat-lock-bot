export class ScheduleNotFoundError extends Error {
  constructor(
    public readonly chatId: string,
    message: string = 'No active schedule found for this target chat identity.',
  ) {
    super(message);
    this.name = 'ScheduleNotFoundError';
    Object.setPrototypeOf(this, ScheduleNotFoundError.prototype);
  }
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class CatchAllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CatchAllExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'An unexpected system error occurred.';
    let errorCode: string | number = 'INTERNAL_SERVER_ERROR';
    let details: Record<string, any> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const rawPayload = exception.getResponse();

      if (typeof rawPayload === 'object' && rawPayload !== null) {
        const payloadRecord = rawPayload as Record<string, any>;
        message = (payloadRecord.message as string) || message;
        errorCode = (payloadRecord.code as number) || 'HTTP_EXCEPTION';
        details = payloadRecord.details as Record<string, any>;
      } else {
        message = rawPayload;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = exception.name;
      this.logger.error(
        `Unhandled system exception: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        'A non-error object was thrown in the runtime environment',
        exception,
      );
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

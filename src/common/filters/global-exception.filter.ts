import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import * as Sentry from '@sentry/node';

export interface ErrorResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || null;

        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);

      Sentry.captureException(exception, {
        contexts: {
          request: {
            method: request?.method,
            url: request?.url,
            headers: request?.headers,
          },
        },
      });
    }

    const errorResponse: ErrorResponse = {
      success: false,
      message,
      error,
    };

    response.status(status).json(errorResponse);
  }
}

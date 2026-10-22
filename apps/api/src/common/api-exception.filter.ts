import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RequestWithId extends Request {
  requestId?: string;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      exception instanceof HttpException ? exception.getResponse() : null;
    const value =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>)
        : {};
    const messages = Array.isArray(value.message) ? value.message : undefined;

    response.status(status).json({
      error: {
        code:
          typeof value.code === 'string'
            ? value.code
            : messages
              ? 'VALIDATION_ERROR'
              : status === 500
                ? 'INTERNAL_ERROR'
                : 'REQUEST_FAILED',
        message:
          typeof value.message === 'string'
            ? value.message
            : messages
              ? 'Check the highlighted fields and try again.'
              : status === 500
                ? 'The server could not complete this request.'
                : 'The request could not be completed.',
        requestId: request.requestId,
        ...(messages ? { details: { fields: messages } } : {}),
      },
    });
  }
}

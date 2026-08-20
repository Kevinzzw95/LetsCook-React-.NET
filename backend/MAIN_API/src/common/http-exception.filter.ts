import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if ((status === 401 || status === 404) && typeof body === 'object' && body && 'statusCode' in body) {
        response.status(status).send();
        return;
      }
      response.status(status).send(body);
      return;
    }

    response.status(status).send({
      title: 'Server Error',
      status: 500,
      detail: process.env.NODE_ENV === 'production' ? null : exception instanceof Error ? exception.stack : null,
    });
  }
}

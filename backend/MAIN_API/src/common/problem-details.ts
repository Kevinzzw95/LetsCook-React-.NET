import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

export function problem(title: string, status = HttpStatus.BAD_REQUEST): HttpException {
  return new HttpException({ title, status }, status);
}

export function validationProblem(errors: Record<string, string[]>): BadRequestException {
  return new BadRequestException({
    type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
    title: 'One or more validation errors occurred.',
    status: 400,
    errors,
  });
}

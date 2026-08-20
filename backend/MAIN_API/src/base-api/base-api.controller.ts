import { BadRequestException, Controller, Get, HttpCode, HttpStatus, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { problem, validationProblem } from '../common/problem-details';

@Controller('baseApi')
export class BaseApiController {
  @Get('not-found') notFound() { throw new NotFoundException(); }
  @Get('bad-request') badRequest() { throw problem('This was not a good request'); }
  @Get('server-error') @HttpCode(HttpStatus.INTERNAL_SERVER_ERROR) serverError() { return 'This is a server error'; }
  @Get('unauthorized') unauthorized() { throw new UnauthorizedException(); }
  @Get('validation-error') validationError() {
    throw validationProblem({ Problem1: ['This is the first error'], Problem2: ['This is the second error'] });
  }
}

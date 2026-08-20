import { Controller, Get, HttpCode, HttpStatus, Type, UnauthorizedException, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { problem, validationProblem } from '../common/problem-details';

function createLegacyActionsController(path: string, protectedController = false): Type<unknown> {
  @Controller(path)
  class LegacyActionsController {
    @Get('not-found') notFound() { throw new NotFoundException(); }
    @Get('bad-request') badRequest() { throw problem('This was not a good request'); }
    @Get('server-error') @HttpCode(HttpStatus.INTERNAL_SERVER_ERROR) serverError() { return 'This is a server error'; }
    @Get('unauthorized') unauthorized() { throw new UnauthorizedException(); }
    @Get('validation-error') validationError() {
      throw validationProblem({ Problem1: ['This is the first error'], Problem2: ['This is the second error'] });
    }
  }

  if (protectedController) UseGuards(JwtAuthGuard)(LegacyActionsController);
  return LegacyActionsController;
}

export const AccountLegacyActionsController = createLegacyActionsController('account');
export const RecipeLegacyActionsController = createLegacyActionsController('recipe');
export const MealPlanLegacyActionsController = createLegacyActionsController('mealPlan', true);
export const ShoppingListLegacyActionsController = createLegacyActionsController('shoppingList', true);

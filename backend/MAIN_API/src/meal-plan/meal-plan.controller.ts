import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuthUser, AuthenticatedUser } from '../auth/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MealPlanService } from './meal-plan.service';

@UseGuards(JwtAuthGuard)
@Controller('mealPlan')
export class MealPlanController {
  constructor(private readonly mealPlan: MealPlanService) {}
  @Get() get(@AuthUser() user: AuthenticatedUser, @Query('year') year: string, @Query('month') month: string) {
    return this.mealPlan.get(user.id, Number(year), Number(month));
  }
  @Post() @HttpCode(HttpStatus.OK)
  add(@AuthUser() user: AuthenticatedUser, @Body() body: { plannedDate?: string; mealType?: string; recipeId?: number | string }) {
    return this.mealPlan.add(user.id, body);
  }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
  delete(@AuthUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) { return this.mealPlan.delete(user.id, id); }
}

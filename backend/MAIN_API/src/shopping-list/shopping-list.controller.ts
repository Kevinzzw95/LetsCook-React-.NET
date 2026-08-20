import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { NoFilesInterceptor } from '@nestjs/platform-express';
import { AuthUser, AuthenticatedUser } from '../auth/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShoppingListService } from './shopping-list.service';

@UseGuards(JwtAuthGuard)
@Controller('shoppingList')
export class ShoppingListController {
  constructor(private readonly shopping: ShoppingListService) {}
  @Get() get(@AuthUser() user: AuthenticatedUser) { return this.shopping.get(user.id); }
  @Put(':itemId') update(@AuthUser() user: AuthenticatedUser, @Param('itemId', ParseIntPipe) id: number, @Body() body: { name?: string; amount?: string; unit?: string; store?: string; isBought?: boolean }) {
    return this.shopping.update(user.id, id, body);
  }
  @Post() @UseInterceptors(NoFilesInterceptor())
  add(@AuthUser() user: AuthenticatedUser, @Body() body: { ingredientId?: string | number; amount?: string; unit?: string }) {
    return this.shopping.add(user.id, body);
  }
  @Post('meal-plan-days') @HttpCode(HttpStatus.OK)
  addDays(@AuthUser() user: AuthenticatedUser, @Body() body: { plannedDates?: string[] }) {
    return this.shopping.addMealPlanDays(user.id, body.plannedDates ?? []);
  }
  @Post('recipe/:recipeId') @HttpCode(HttpStatus.OK)
  addRecipe(@AuthUser() user: AuthenticatedUser, @Param('recipeId', ParseIntPipe) id: number) {
    return this.shopping.addRecipe(user.id, id);
  }
}

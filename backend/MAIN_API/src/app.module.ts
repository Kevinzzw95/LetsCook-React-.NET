import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountModule } from './account/account.module';
import { BaseApiController } from './base-api/base-api.controller';
import { PrismaModule } from './database/prisma.module';
import { MealPlanModule } from './meal-plan/meal-plan.module';
import { RecipeModule } from './recipe/recipe.module';
import { ShoppingListModule } from './shopping-list/shopping-list.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule, RedisModule, AccountModule, RecipeModule, ShoppingListModule, MealPlanModule,
  ],
  controllers: [BaseApiController],
})
export class AppModule {}

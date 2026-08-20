import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MealPlanController } from './meal-plan.controller';
import { MealPlanService } from './meal-plan.service';
import { MealPlanLegacyActionsController } from '../base-api/legacy-actions.controller';

@Module({
  imports: [AuthModule],
  controllers: [MealPlanLegacyActionsController, MealPlanController], providers: [MealPlanService],
})
export class MealPlanModule {}

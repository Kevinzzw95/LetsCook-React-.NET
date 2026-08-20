import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImageService } from './image.service';
import { NutritionService } from './nutrition.service';
import { RecipeController } from './recipe.controller';
import { RecipeService } from './recipe.service';
import { RecipeLegacyActionsController } from '../base-api/legacy-actions.controller';

@Module({
  imports: [AuthModule],
  controllers: [RecipeLegacyActionsController, RecipeController],
  providers: [RecipeService, ImageService, NutritionService],
})
export class RecipeModule {}

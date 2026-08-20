import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ShoppingListController } from './shopping-list.controller';
import { ShoppingListService } from './shopping-list.service';
import { ShoppingListLegacyActionsController } from '../base-api/legacy-actions.controller';

@Module({
  imports: [AuthModule],
  controllers: [ShoppingListLegacyActionsController, ShoppingListController], providers: [ShoppingListService],
})
export class ShoppingListModule {}

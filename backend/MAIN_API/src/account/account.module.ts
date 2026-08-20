import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AccountLegacyActionsController } from '../base-api/legacy-actions.controller';

@Module({
  imports: [AuthModule],
  controllers: [AccountLegacyActionsController, AccountController],
  providers: [AccountService],
})
export class AccountModule {}

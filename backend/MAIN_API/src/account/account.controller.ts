import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards } from '@nestjs/common';
import { AuthUser, AuthenticatedUser } from '../auth/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountService } from './account.service';
import { LoginDto, RefreshRequestDto, RegisterDto, UpdateProfileDto } from './account.dto';

@Controller('account')
export class AccountController {
	constructor(private readonly account: AccountService) {}

	@Post('login') @HttpCode(HttpStatus.OK)
	login(@Body() dto: LoginDto) { return this.account.login(dto); }

	@Post('refresh') @HttpCode(HttpStatus.OK)
	refresh(@Body() dto: RefreshRequestDto) { return this.account.refresh(dto.refreshToken); }

	@Post('register')
	async register(@Body() dto: RegisterDto): Promise<void> { await this.account.register(dto); }

	@UseGuards(JwtAuthGuard) @Get('currentUser')
	currentUser(@AuthUser() user: AuthenticatedUser) { return this.account.currentUser(user.id); }

	@UseGuards(JwtAuthGuard) @Put('profile')
	profile(@AuthUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
		return this.account.updateProfile(user.id, dto);
	}
}

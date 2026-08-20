import {
  Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, ParseIntPipe,
  Post, Put, Query, Res, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthUser, AuthenticatedUser } from '../auth/auth-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecipeService } from './recipe.service';
import { RecipeForm } from './recipe.types';

@Controller('recipe')
export class RecipeController {
	constructor(private readonly recipes: RecipeService) {}

	@UseGuards(JwtAuthGuard) @Get()
	list(@AuthUser() user: AuthenticatedUser) { return this.recipes.list(user.id); }

	@UseGuards(JwtAuthGuard) @Get('search')
	search(
		@AuthUser() user: AuthenticatedUser,
		@Query('query') query?: string, @Query('type') type?: string, @Query('cuisine') cuisine?: string,
		@Query('diet') diet?: string, @Query('pageNumber') pageNumber?: string, @Query('pageSize') pageSize?: string,
	) {
		return this.recipes.search(user.id, { query, type, cuisine, diet, pageNumber: Number(pageNumber), pageSize: Number(pageSize) });
	}

	@UseGuards(JwtAuthGuard) @Get('facets')
	facets(
		@AuthUser() user: AuthenticatedUser,
		@Query('query') query?: string, @Query('type') type?: string, @Query('cuisine') cuisine?: string, @Query('diet') diet?: string,
	) { return this.recipes.facets(user.id, { query, type, cuisine, diet }); }

	@Get(':id')
	get(@Param('id', ParseIntPipe) id: number) { return this.recipes.get(id); }

	@UseGuards(JwtAuthGuard) @Post() @UseInterceptors(FilesInterceptor('images'))
	async create(
		@AuthUser() user: AuthenticatedUser, @Body() form: RecipeForm,
		@UploadedFiles() files: Express.Multer.File[] = [], @Res({ passthrough: true }) response: Response,
	) {
		const id = await this.recipes.create(user.id, form, files);
		response.location(`/api/recipe/${id}`);
		return id;
	}

	@UseGuards(JwtAuthGuard) @Put(':id') @UseInterceptors(FilesInterceptor('images'))
	update(
		@AuthUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number,
		@Body() form: RecipeForm, @UploadedFiles() files: Express.Multer.File[] = [],
	) { return this.recipes.update(user.id, id, form, files); }

	@UseGuards(JwtAuthGuard) @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT)
	delete(@AuthUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
		return this.recipes.delete(user.id, id);
	}
}

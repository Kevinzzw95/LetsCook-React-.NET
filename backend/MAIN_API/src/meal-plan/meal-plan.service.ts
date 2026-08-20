import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { problem } from '../common/problem-details';
import { PrismaService } from '../database/prisma.service';

type EntryWithRecipe = Prisma.MealPlanEntryGetPayload<{ include: { recipe: true } }>;

@Injectable()
export class MealPlanService {
  constructor(private readonly prisma: PrismaService) {}

  private imageUrls(value: Prisma.JsonValue): string[] {
    if (!value || Array.isArray(value) || typeof value !== 'object') return [];
    return Object.values(value).filter((entry): entry is string => typeof entry === 'string');
  }

  private map(entry: EntryWithRecipe) {
    return {
      id: Number(entry.Id), plannedDate: entry.PlannedDate, mealType: entry.MealType,
      recipeId: Number(entry.RecipeId), recipeTitle: entry.recipe.Title,
      recipeImageUrl: this.imageUrls(entry.recipe.ImageInfo)[0] ?? null,
      servings: entry.recipe.Servings, cookingMinutes: entry.recipe.CookingMinutes,
    };
  }

  async get(userId: string, year: number, month: number) {
    if (month < 1 || month > 12) throw problem('Month must be between 1 and 12.');
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const values = await this.prisma.mealPlanEntry.findMany({
      where: { UserId: userId, PlannedDate: { gte: start, lt: end } },
      include: { recipe: true },
      orderBy: [{ PlannedDate: 'asc' }, { MealType: 'asc' }],
    });
    return values.map((entry) => this.map(entry));
  }

  async add(userId: string, dto: { plannedDate?: string; mealType?: string; recipeId?: number | string }) {
    const mealType = dto.mealType?.trim().toLowerCase();
    if (!dto.plannedDate || !mealType || !['breakfast', 'lunch', 'dinner'].includes(mealType) || !dto.recipeId) {
      throw problem('Invalid meal plan entry.');
    }
    const recipe = await this.prisma.recipe.findUnique({ where: { Id: BigInt(dto.recipeId) } });
    if (!recipe) throw problem('Recipe not found.');
    const inputDate = new Date(dto.plannedDate);
    const plannedDate = new Date(Date.UTC(inputDate.getUTCFullYear(), inputDate.getUTCMonth(), inputDate.getUTCDate()));
    const now = new Date();
    const entry = await this.prisma.mealPlanEntry.create({
      data: { UserId: userId, PlannedDate: plannedDate, MealType: mealType, RecipeId: recipe.Id, CreatedAt: now, UpdatedAt: now },
      include: { recipe: true },
    });
    return this.map(entry);
  }

  async delete(userId: string, id: number): Promise<void> {
    const entry = await this.prisma.mealPlanEntry.findFirst({ where: { Id: BigInt(id), UserId: userId } });
    if (!entry) throw new NotFoundException();
    await this.prisma.mealPlanEntry.delete({ where: { Id: entry.Id } });
  }
}

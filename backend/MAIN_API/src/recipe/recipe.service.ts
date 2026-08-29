import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Recipe } from '@prisma/client';
import { problem } from '../common/problem-details';
import { PrismaService } from '../database/prisma.service';
import { ImageService } from './image.service';
import { NutritionService } from './nutrition.service';
import { IngredientInput, RecipeForm, StepInput } from './recipe.types';

type RecipeWithDetails = Prisma.RecipeGetPayload<{
  include: { instructions: { include: { steps: true } }; recipeIngredients: true };
}>;

@Injectable()
export class RecipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageService,
    private readonly nutrition: NutritionService,
  ) {}

  async recipe(recipeWhereUniqueInput: Prisma.RecipeWhereUniqueInput): Promise<Recipe | null> {
    return this.prisma.recipe.findUnique({ where: recipeWhereUniqueInput });
  }

  async recipes(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.RecipeWhereUniqueInput;
    where?: Prisma.RecipeWhereInput;
    orderBy?: Prisma.RecipeOrderByWithRelationInput;
  }): Promise<Recipe[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.recipe.findMany({ skip, take, cursor, where, orderBy });
  }

  private imageMap(value: Prisma.JsonValue): Record<string, string> {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
  }

  private summary(recipe: Recipe) {
    return {
      id: Number(recipe.Id), title: recipe.Title, imageUrls: Object.values(this.imageMap(recipe.ImageInfo)),
      servings: recipe.Servings, preparationMinutes: recipe.PreparationMinutes, cookingMinutes: recipe.CookingMinutes,
      sourceName: recipe.SourceName, sourceUrl: recipe.SourceUrl, cuisine: recipe.Cuisine, diets: recipe.Diets,
      instructions: null, dishType: recipe.DishType, summary: recipe.Summary, calories: Number(recipe.Calories),
      protein: Number(recipe.Protein), carbohydrate: Number(recipe.Carbohydrate), fat: Number(recipe.Fat),
      createdAt: '0001-01-01T00:00:00', updatedAt: '0001-01-01T00:00:00', userId: null, extendedIngredients: null,
    };
  }

  private full(recipe: RecipeWithDetails) {
    return {
      id: Number(recipe.Id), title: recipe.Title, imageUrls: Object.values(this.imageMap(recipe.ImageInfo)), servings: recipe.Servings,
      preparationMinutes: recipe.PreparationMinutes, cookingMinutes: recipe.CookingMinutes, sourceName: recipe.SourceName,
      sourceUrl: recipe.SourceUrl, cuisine: recipe.Cuisine, diets: recipe.Diets,
      instructions: recipe.instructions.map((instruction) => ({
        name: instruction.Name,
        steps: instruction.steps.sort((a, b) => a.Id - b.Id).map((step) => ({ stepNumber: step.StepNumber, description: step.Description })),
      })),
      dishType: recipe.DishType, summary: recipe.Summary, calories: Number(recipe.Calories), protein: Number(recipe.Protein),
      carbohydrate: Number(recipe.Carbohydrate), fat: Number(recipe.Fat), createdAt: recipe.CreatedAt, updatedAt: recipe.UpdatedAt,
      userId: recipe.UserId,
      extendedIngredients: recipe.recipeIngredients.sort((a, b) => a.SortOrder - b.SortOrder).map((item) => ({
        id: Number(item.IngredientId), consistency: item.Consistency, original: item.Original,
        amount: item.Amount, unit: item.Unit, name: item.DisplayName, image: item.DisplayImage,
      })),
    };
  }

  private where(userId: string, filters: { query?: string; type?: string; cuisine?: string; diet?: string }): Prisma.RecipeWhereInput {
    const terms = filters.query?.trim().split(/\s+/).filter(Boolean) ?? [];
    return {
      UserId: userId,
      ...(filters.type?.trim() ? { DishType: { equals: filters.type, mode: 'insensitive' as const } } : {}),
      ...(filters.cuisine?.trim() ? { Cuisine: { equals: filters.cuisine, mode: 'insensitive' as const } } : {}),
      ...(filters.diet?.trim() ? { Diets: { has: filters.diet } } : {}),
      AND: terms.map((term) => ({
        OR: [
          { Title: { contains: term, mode: 'insensitive' as const } },
          { recipeIngredients: { some: { DisplayName: { contains: term, mode: 'insensitive' as const } } } },
        ],
      })),
    };
  }

  async list(userId: string) {
    return (await this.recipes({ where: { UserId: userId } })).map((recipe) => this.summary(recipe));
  }

  async search(userId: string, filters: { query?: string; type?: string; cuisine?: string; diet?: string; pageNumber?: number; pageSize?: number }) {
    const pageNumber = !filters.pageNumber || filters.pageNumber < 1 ? 1 : filters.pageNumber;
    const pageSize = !filters.pageSize || filters.pageSize < 1 || filters.pageSize > 50 ? 12 : filters.pageSize;
    const where = this.where(userId, filters);
    const [totalCount, items] = await this.prisma.$transaction([
      this.prisma.recipe.count({ where }),
      this.prisma.recipe.findMany({
        where, orderBy: { UpdatedAt: 'desc' }, skip: (pageNumber - 1) * pageSize, take: pageSize,
      }),
    ]);
    return { items: items.map((recipe) => this.summary(recipe)), totalCount, pageNumber, pageSize, totalPages: Math.ceil(totalCount / pageSize) };
  }

  async facets(userId: string, filters: { query?: string; type?: string; cuisine?: string; diet?: string }) {
    const values = await this.prisma.recipe.findMany({ where: this.where(userId, filters) });
    const count = (items: Array<string | null | undefined>) => items.filter(Boolean).reduce<Record<string, number>>((result, item) => {
      result[item!] = (result[item!] ?? 0) + 1; return result;
    }, {});
    return {
      totalCount: values.length,
      type: count(values.map((recipe) => recipe.DishType)),
      cuisine: count(values.map((recipe) => recipe.Cuisine)),
      diet: count(values.flatMap((recipe) => recipe.Diets).filter((diet) => diet !== 'None')),
    };
  }

  async get(id: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { Id: BigInt(id) },
      include: { instructions: { include: { steps: true } }, recipeIngredients: true },
    });
    if (!recipe) throw new NotFoundException();
    return this.full(recipe);
  }

  private parse<T>(raw: string | undefined, fallback: T): T {
    if (!raw?.trim()) return fallback;
    try { return JSON.parse(raw) as T; } catch { throw problem('Invalid JSON in recipe form data.'); }
  }

  private diets(value?: string | string[]): string[] {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }

  private number(value?: string | number): number {
    const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0;
  }

  private async imageInfo(current: Record<string, string>, form: RecipeForm, files: Express.Multer.File[]): Promise<Record<string, string>> {
    const kept = this.parse<string[]>(form.existingImageUrls, []);
    const result = { ...current };
    for (const [key, url] of Object.entries(result)) {
      if (!kept.includes(url)) { await this.images.delete(key); delete result[key]; }
    }
    if (files.length) {
      for (const file of files) { const uploaded = await this.images.upload(file); result[uploaded.public_id] = uploaded.secure_url; }
    } else {
      Object.assign(result, this.parse<Record<string, string>>(form.imageInfo, {}));
    }
    return result;
  }

  private async replaceChildren(transaction: Prisma.TransactionClient, recipeId: bigint, steps: StepInput[], ingredients: IngredientInput[]): Promise<void> {
    await transaction.instruction.deleteMany({ where: { RecipeId: recipeId } });
    await transaction.recipeIngredient.deleteMany({ where: { RecipeId: recipeId } });
    await transaction.instruction.create({
      data: {
        RecipeId: recipeId,
        Name: null,
        steps: { create: steps.map((step) => ({ StepNumber: step.stepNumber, Description: step.description })) },
      },
    });

    for (const [index, input] of ingredients.entries()) {
      const name = input.name.trim();
      let ingredient = await transaction.ingredient.findFirst({ where: { Name: { equals: name, mode: 'insensitive' } } });
      if (!ingredient) ingredient = await transaction.ingredient.create({ data: { Name: name, Image: null } });
      await transaction.recipeIngredient.create({ data: {
        RecipeId: recipeId, IngredientId: ingredient.Id, Amount: input.amount ?? null, Unit: input.unit ?? null,
        Consistency: null, Original: [input.amount?.trim(), input.unit?.trim(), name].filter(Boolean).join(' '),
        DisplayName: ingredient.Name, DisplayImage: ingredient.Image, SortOrder: index,
      } });
    }
  }

  async create(userId: string, form: RecipeForm, files: Express.Multer.File[]): Promise<number> {
    if (!form.title?.trim() || !form.sourceName?.trim() || !form.steps || !form.ingredients) throw problem('Required recipe fields are missing.');
    const steps = this.parse<StepInput[]>(form.steps, []);
    const ingredients = this.parse<IngredientInput[]>(form.ingredients, []);
    const ingredientsEn = this.parse<IngredientInput[]>(form.ingredientsEn, ingredients);
    const images = await this.imageInfo({}, form, files);
    const nutrition = await this.nutrition.calculate(ingredientsEn);
    const recipe = await this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const saved = await transaction.recipe.create({ data: {
        Title: form.title,
        ImageInfo: images,
        Servings: this.number(form.servings),
        PreparationMinutes: this.number(form.preparationMinutes),
        CookingMinutes: this.number(form.cookingMinutes),
        SourceName: form.sourceName,
        SourceUrl: form.sourceUrl ?? null,
        Cuisine: form.cuisine ?? null,
        Diets: this.diets(form.diets),
        DishType: form.dishType ?? null,
        Summary: form.summary ?? null,
        Calories: this.number(nutrition.calories),
        Protein: this.number(nutrition.protein),
        Carbohydrate: this.number(nutrition.carbohydrate),
        Fat: this.number(nutrition.fat),
        CreatedAt: now,
        UpdatedAt: now,
        UserId: userId,
      } });
      await this.replaceChildren(transaction, saved.Id, steps, ingredients);
      return saved;
    });
    return Number(recipe.Id);
  }

  async update(userId: string, id: number, form: RecipeForm, files: Express.Multer.File[]): Promise<number> {
    const recipe = await this.prisma.recipe.findFirst({ where: { Id: BigInt(id), UserId: userId } });
    if (!recipe) throw new NotFoundException();
    const steps = this.parse<StepInput[]>(form.steps, []);
    const ingredients = this.parse<IngredientInput[]>(form.ingredients, []);
    const ingredientsEn = this.parse<IngredientInput[]>(form.ingredientsEn, ingredients);
    const images = await this.imageInfo(this.imageMap(recipe.ImageInfo), form, files);
    const nutrition = await this.nutrition.calculate(ingredientsEn);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.recipe.update({
        where: { Id: recipe.Id },
        data: {
          Title: form.title,
          ImageInfo: images,
          Servings: this.number(form.servings),
          PreparationMinutes: this.number(form.preparationMinutes),
          CookingMinutes: this.number(form.cookingMinutes),
          SourceName: form.sourceName,
          SourceUrl: form.sourceUrl ?? null,
          Cuisine: form.cuisine ?? null,
          Diets: this.diets(form.diets),
          DishType: form.dishType ?? null,
          Summary: form.summary ?? null,
          Calories: this.number(nutrition.calories),
          Protein: this.number(nutrition.protein),
          Carbohydrate: this.number(nutrition.carbohydrate),
          Fat: this.number(nutrition.fat),
          UpdatedAt: new Date(),
        },
      });
      await this.replaceChildren(transaction, recipe.Id, steps, ingredients);
    });
    return id;
  }

  async delete(userId: string, id: number): Promise<void> {
    const recipe = await this.prisma.recipe.findFirst({ where: { Id: BigInt(id), UserId: userId } });
    if (!recipe) throw new NotFoundException();
    for (const key of Object.keys(this.imageMap(recipe.ImageInfo))) await this.images.delete(key);
    await this.prisma.recipe.delete({ where: { Id: recipe.Id } });
  }
}

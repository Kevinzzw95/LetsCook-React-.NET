import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { problem } from '../common/problem-details';
import { PrismaService } from '../database/prisma.service';

type ListWithItems = Prisma.ShoppingListGetPayload<{ include: { items: { include: { ingredient: true } } } }>;
type RecipeWithIngredients = Prisma.RecipeGetPayload<{ include: { recipeIngredients: true } }>;

@Injectable()
export class ShoppingListService {
  constructor(private readonly prisma: PrismaService) {}

  private map(list: ListWithItems) {
    return {
      userId: list.UserId,
      items: (list.items ?? []).map((item) => ({
        itemId: Number(item.Id), name: item.ingredient?.Name, image: item.ingredient?.Image,
        amount: item.Amount, unit: item.Unit, store: item.Store, isBought: item.IsBought,
      })),
    };
  }

  private async getOrCreate(userId: string): Promise<ListWithItems> {
    let list = await this.prisma.shoppingList.findFirst({
      where: { UserId: userId }, include: { items: { include: { ingredient: true } } },
    });
    if (!list) {
      list = await this.prisma.shoppingList.create({
        data: { UserId: userId, ClientSecret: null }, include: { items: { include: { ingredient: true } } },
      });
    }
    return list;
  }

  async get(userId: string) { return this.map(await this.getOrCreate(userId)); }

  async update(userId: string, itemId: number, dto: { name?: string; amount?: string; unit?: string; store?: string; isBought?: boolean }) {
    const item = await this.prisma.shoppingItem.findFirst({
      where: { Id: BigInt(itemId), shoppingList: { UserId: userId } }, include: { ingredient: true },
    });
    if (!item) throw new NotFoundException();
    const updated = await this.prisma.shoppingItem.update({
      where: { Id: item.Id },
      data: { Amount: dto.amount ?? null, Unit: dto.unit ?? null, Store: dto.store ?? null, IsBought: dto.isBought ?? false },
      include: { ingredient: true },
    });
    const ingredient = updated.ingredient ? {
      ...updated.ingredient,
      Id: updated.ingredient.Id.toString(),
      UsdaFdcId: updated.ingredient.UsdaFdcId?.toString() ?? null,
    } : null;
    return {
      id: Number(updated.Id), ingredient, amount: updated.Amount, unit: updated.Unit,
      store: updated.Store, isBought: updated.IsBought, shoppingList: null, shoppingListId: updated.ShoppingListId,
    };
  }

  async add(userId: string, dto: { ingredientId?: string | number; amount?: string; unit?: string }) {
    const list = await this.getOrCreate(userId);
    if (dto.ingredientId === undefined) throw problem('Ingredient Not Found');
    const ingredient = await this.prisma.ingredient.findUnique({ where: { Id: BigInt(dto.ingredientId) } });
    if (!ingredient) throw problem('Ingredient Not Found');
    const item = await this.prisma.shoppingItem.create({ data: {
      ShoppingListId: list.Id, IngredientId: ingredient.Id, Amount: dto.amount ?? null,
      Unit: dto.unit ?? null, Store: null, IsBought: false,
    } });
    return { itemId: Number(item.Id), name: ingredient.Name, image: ingredient.Image, amount: item.Amount, unit: item.Unit, store: item.Store, isBought: item.IsBought };
  }

  private async addRecipes(list: ListWithItems, recipes: RecipeWithIngredients[]): Promise<number> {
    const rows = recipes.flatMap((recipe) => recipe.recipeIngredients ?? []).sort((a, b) => a.SortOrder - b.SortOrder);
    if (!rows.length) return 0;
    const ingredients = await this.prisma.ingredient.findMany({ where: { Id: { in: [...new Set(rows.map((row) => row.IngredientId))] } } });
    const byId = new Map(ingredients.map((ingredient) => [ingredient.Id, ingredient]));
    const newItems = rows.filter((row) => byId.has(row.IngredientId)).map((row) => ({
      ShoppingListId: list.Id, IngredientId: row.IngredientId, Amount: row.Amount, Unit: row.Unit, Store: null, IsBought: false,
    }));
    await this.prisma.shoppingItem.createMany({ data: newItems });
    return newItems.length;
  }

  async addMealPlanDays(userId: string, plannedDates: string[]) {
    const dateStrings = [...new Set((plannedDates ?? []).map((value) => {
      const date = new Date(value); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
    }))];
    const dates = dateStrings.map((value) => new Date(value));
    if (!dates.length) throw problem('At least one planned date is required.');
    const list = await this.getOrCreate(userId);
    const entries = await this.prisma.mealPlanEntry.findMany({
      where: { UserId: userId, PlannedDate: { in: dates } }, include: { recipe: { include: { recipeIngredients: true } } },
    });
    if (!entries.length) return { selectedDaysCount: dates.length, addedItemsCount: 0 };
    return { selectedDaysCount: dates.length, addedItemsCount: await this.addRecipes(list, entries.map((entry) => entry.recipe)) };
  }

  async addRecipe(userId: string, recipeId: number) {
    const list = await this.getOrCreate(userId);
    const recipe = await this.prisma.recipe.findUnique({ where: { Id: BigInt(recipeId) }, include: { recipeIngredients: true } });
    if (!recipe) throw new NotFoundException();
    return { selectedDaysCount: 0, addedItemsCount: await this.addRecipes(list, [recipe]) };
  }
}

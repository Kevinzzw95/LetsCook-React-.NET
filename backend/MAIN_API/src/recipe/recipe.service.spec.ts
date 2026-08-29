import { RecipeService } from './recipe.service';

describe('RecipeService', () => {
  it('sanitizes invalid nutrition totals before creating required decimals', async () => {
    const recipeCreate = jest.fn().mockResolvedValue({ Id: 1n });
    const transaction = {
      recipe: { create: recipeCreate },
      instruction: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      recipeIngredient: { deleteMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(transaction)),
    };
    const images = {
      upload: jest.fn(),
      delete: jest.fn(),
    };
    const nutrition = {
      calculate: jest.fn().mockResolvedValue({
        calories: Number.NaN,
        protein: Number.NaN,
        carbohydrate: Number.POSITIVE_INFINITY,
        fat: Number.NEGATIVE_INFINITY,
      }),
    };
    const service = new RecipeService(prisma as never, images as never, nutrition as never);

    await service.create('user-1', {
      title: '水煮肉片',
      servings: 4,
      preparationMinutes: 0,
      cookingMinutes: 0,
      sourceName: 'url',
      steps: '[]',
      ingredients: '[]',
      ingredientsEn: '[]',
      imageInfo: '{}',
    }, []);

    expect(recipeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        Calories: 0,
        Protein: 0,
        Carbohydrate: 0,
        Fat: 0,
      }),
    });
  });
});

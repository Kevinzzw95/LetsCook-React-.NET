import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IngredientInput } from './recipe.types';

interface Nutrient { amount?: number; nutrient?: { number?: string; name?: string }; }
interface Portion { amount?: number; gramWeight?: number; modifier?: string; portionDescription?: string; measureUnit?: { abbreviation?: string; name?: string }; }
interface FoodDetail { foodNutrients?: Nutrient[]; foodPortions?: Portion[]; servingSize?: number; servingSizeUnit?: string; }

@Injectable()
export class NutritionService {
  private readonly logger = new Logger(NutritionService.name);
  constructor(private readonly config: ConfigService) {}

  async calculate(ingredients: IngredientInput[]): Promise<{ calories: number; protein: number; carbohydrate: number; fat: number }> {
    const totals = { calories: 0, protein: 0, carbohydrate: 0, fat: 0 };
    const apiKey = this.config.get<string>('USDA_API_KEY');
    if (!apiKey) return totals;
    const baseURL = this.config.get<string>('USDA_BASE_URL', 'https://api.nal.usda.gov/fdc/v1/');

    for (const ingredient of ingredients.filter((item) => item.name?.trim())) {
      try {
        const search = await axios.get(`${baseURL}foods/search`, { params: { query: ingredient.name, pageSize: 5, api_key: apiKey } });
        const foods = (search.data?.foods ?? []) as Array<{ fdcId: number; dataType?: string; score?: number }>;
        const priorities: Record<string, number> = { Foundation: 0, 'SR Legacy': 1, 'Survey (FNDDS)': 2, Branded: 3 };
        foods.sort((a, b) => (priorities[a.dataType ?? ''] ?? 4) - (priorities[b.dataType ?? ''] ?? 4) || (b.score ?? 0) - (a.score ?? 0));
        if (!foods[0]) continue;
        const detail = (await axios.get(`${baseURL}food/${foods[0].fdcId}`, { params: { api_key: apiKey } })).data as FoodDetail;
        const grams = this.weightInGrams(ingredient, detail);
        if (grams <= 0) continue;
        const basis = detail.servingSize && this.isGram(detail.servingSizeUnit) ? detail.servingSize : 100;
        const scale = grams / basis;
        totals.calories += this.nutrient(detail, '208', 'Energy') * scale;
        totals.protein += this.nutrient(detail, '203', 'Protein') * scale;
        totals.carbohydrate += this.nutrient(detail, '205', 'Carbohydrate') * scale;
        totals.fat += this.nutrient(detail, '204', 'Total lipid') * scale;
      } catch (error) {
        this.logger.warn(`Unable to calculate nutrition for ${ingredient.name}: ${error instanceof Error ? error.message : error}`);
      }
    }
    return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Math.round(value * 100) / 100])) as typeof totals;
  }

  private amount(raw?: string): number {
    if (!raw?.trim()) return 0;
    const direct = Number(raw.trim());
    if (Number.isFinite(direct)) return direct;
    const segments = raw.trim().split(/\s+/);
    const fraction = (value: string): number => {
      const [a, b] = value.split('/').map(Number);
      return Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : 0;
    };
    return segments.length === 2 ? Number(segments[0]) + fraction(segments[1]) : fraction(raw.trim());
  }

  private normalizeUnit(unit?: string): string {
    const value = unit?.trim().toLowerCase() ?? '';
    const groups: Record<string, string[]> = {
      g: ['g', 'gram', 'grams'], kg: ['kg', 'kilogram', 'kilograms'], oz: ['oz', 'ounce', 'ounces'],
      lb: ['lb', 'lbs', 'pound', 'pounds'], cup: ['cup', 'cups'], tbsp: ['tbsp', 'tablespoon', 'tablespoons'],
      tsp: ['tsp', 'teaspoon', 'teaspoons'], ml: ['ml', 'milliliter', 'milliliters'], l: ['l', 'liter', 'liters'],
      piece: ['piece', 'pieces', 'pc', 'pcs', 'whole'], slice: ['slice', 'slices'],
    };
    return Object.entries(groups).find(([, values]) => values.includes(value))?.[0] ?? value;
  }

  private weightInGrams(ingredient: IngredientInput, food: FoodDetail): number {
    const amount = this.amount(ingredient.amount);
    const unit = this.normalizeUnit(ingredient.unit);
    if (amount <= 0) return 0;
    const fixed: Record<string, number> = { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237, cup: 240, tbsp: 14.7868, tsp: 4.92892, ml: 1, l: 1000 };
    if (fixed[unit]) return amount * fixed[unit];
    const aliases: Record<string, string[]> = { piece: ['piece', 'pieces', 'pc', 'pcs', 'whole'], slice: ['slice', 'slices'] };
    const portion = food.foodPortions?.find((candidate) => {
      const values = [candidate.measureUnit?.abbreviation, candidate.measureUnit?.name, candidate.modifier, candidate.portionDescription];
      return values.some((value) => value && (aliases[unit] ?? [unit]).some((alias) => value.toLowerCase().includes(alias)));
    });
    if (portion?.gramWeight) return amount / (portion.amount || 1) * portion.gramWeight;
    return (unit === '' || unit === 'piece' || unit === 'slice') && food.servingSize && this.isGram(food.servingSizeUnit) ? amount * food.servingSize : 0;
  }

  private isGram(unit?: string): boolean { return ['g', 'gm', 'gram', 'grams'].includes(unit?.toLowerCase() ?? ''); }
  private nutrient(food: FoodDetail, number: string, prefix: string): number {
    return food.foodNutrients?.find((item) => item.nutrient?.number === number || item.nutrient?.name?.startsWith(prefix))?.amount ?? 0;
  }
}

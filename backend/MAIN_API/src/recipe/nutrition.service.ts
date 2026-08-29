import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IngredientInput } from './recipe.types';

interface Nutrient { amount?: number; nutrient?: { number?: string; name?: string }; }
interface Portion { amount?: number; gramWeight?: number; modifier?: string; portionDescription?: string; measureUnit?: { abbreviation?: string; name?: string }; }
interface FoodDetail { foodNutrients?: Nutrient[]; foodPortions?: Portion[]; servingSize?: number; servingSizeUnit?: string; }
interface FoodSearchResult { fdcId?: number; dataType?: string; score?: number; }

@Injectable()
export class NutritionService {
  private readonly logger = new Logger(NutritionService.name);
  constructor(private readonly config: ConfigService) {}

  async calculate(ingredients: IngredientInput[]): Promise<{ calories: number; protein: number; carbohydrate: number; fat: number }> {
    const totals = { calories: 0, protein: 0, carbohydrate: 0, fat: 0 };
    const apiKey = this.config.get<string>('USDA_API_KEY');
    if (!apiKey) return totals;
    const baseURL = this.config.get<string>('USDA_BASE_URL', 'https://api.nal.usda.gov/fdc/v1/').trim().replace(/\/+$/, '');

    for (const ingredient of ingredients.filter((item) => item.name?.trim())) {
      try {
        const foods = await this.searchFoods(ingredient.name, baseURL, apiKey);
        const priorities: Record<string, number> = { Foundation: 0, 'SR Legacy': 1, 'Survey (FNDDS)': 2, Branded: 3 };
        foods.sort((a, b) => (priorities[a.dataType ?? ''] ?? 4) - (priorities[b.dataType ?? ''] ?? 4) || (b.score ?? 0) - (a.score ?? 0));
        const detail = await this.firstAvailableFoodDetail(foods, baseURL, apiKey);
        if (!detail) {
          this.logger.debug(`No usable USDA nutrition data was found for ${ingredient.name}; skipping it.`);
          continue;
        }
        const grams = this.weightInGrams(ingredient, detail);
        if (grams <= 0) continue;
        const servingSize = this.finite(detail.servingSize);
        const basis = servingSize > 0 && this.isGram(detail.servingSizeUnit) ? servingSize : 100;
        const scale = grams / basis;
        totals.calories += this.nutrient(detail, '208', 'Energy') * scale;
        totals.protein += this.nutrient(detail, '203', 'Protein') * scale;
        totals.carbohydrate += this.nutrient(detail, '205', 'Carbohydrate') * scale;
        totals.fat += this.nutrient(detail, '204', 'Total lipid') * scale;
      } catch (error) {
        if (this.isUnavailableFood(error)) {
          this.logger.debug(`No usable USDA nutrition data was found for ${ingredient.name}; skipping it.`);
          continue;
        }
        this.logger.warn(`Unable to calculate nutrition for ${ingredient.name}: ${error instanceof Error ? error.message : error}`);
      }
    }
    return Object.fromEntries(Object.entries(totals).map(([key, value]) => {
      const finiteValue = this.finite(value);
      return [key, Math.round(finiteValue * 100) / 100];
    })) as typeof totals;
  }

  private async searchFoods(name: string, baseURL: string, apiKey: string): Promise<FoodSearchResult[]> {
    for (const query of this.searchQueries(name)) {
      try {
        const response = await axios.get(`${baseURL}/foods/search`, {
          params: { query, pageSize: 5, api_key: apiKey },
        });
        const foods = (response.data?.foods ?? []) as FoodSearchResult[];
        if (foods.length) return foods;
      } catch (error) {
        if (this.isUnavailableFood(error)) continue;
        throw error;
      }
    }
    return [];
  }

  private searchQueries(name: string): string[] {
    const normalized = name.trim().replace(/\s+/g, ' ');
    const lowerName = normalized.toLowerCase();
    const candidates: string[] = [];

    const aliases: Array<[RegExp, string]> = [
      [/pork\s+collar|shoulder\s+butt/i, 'pork shoulder'],
      [/doubanjiang/i, 'broad bean paste'],
      [/chicken\s+bouillon/i, 'chicken bouillon'],
      [/(^|[\s/])msg($|[\s/])/i, 'monosodium glutamate'],
    ];
    for (const [pattern, replacement] of aliases) {
      if (pattern.test(lowerName)) candidates.push(replacement);
    }

    const parentheticalNames = [...normalized.matchAll(/\(([^)]+)\)/g)]
      .map((match) => match[1].trim());
    candidates.push(...parentheticalNames);

    const withoutParentheses = normalized.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    const slashParts = withoutParentheses.split('/').map((part) => part.trim()).filter(Boolean);
    candidates.push(...slashParts);
    if (slashParts.length > 1) {
      const contextWord = slashParts[0].split(/\s+/)[0];
      candidates.push(...slashParts.slice(1).map((part) => `${contextWord} ${part}`));
    }

    candidates.push(
      normalized.replace(/[()/]+/g, ' ').replace(/\s+/g, ' ').trim(),
      withoutParentheses,
      normalized,
    );

    return [...new Set(candidates.filter(Boolean))];
  }

  private async firstAvailableFoodDetail(foods: FoodSearchResult[], baseURL: string, apiKey: string): Promise<FoodDetail | undefined> {
    for (const food of foods) {
      const fdcId = Number(food.fdcId);
      if (!Number.isSafeInteger(fdcId) || fdcId <= 0) continue;

      try {
        const response = await axios.get(`${baseURL}/food/${fdcId}`, { params: { api_key: apiKey } });
        return response.data as FoodDetail;
      } catch (error) {
        if (this.isUnavailableFood(error)) {
          this.logger.debug(`USDA food detail ${fdcId} is unavailable; trying the next search result.`);
          continue;
        }
        throw error;
      }
    }
    return undefined;
  }

  private isUnavailableFood(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;
    return error.response?.status === 400 || error.response?.status === 404;
  }

  private finite(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
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
    const amount = food.foodNutrients?.find(
      (item) => item.nutrient?.number === number || item.nutrient?.name?.startsWith(prefix),
    )?.amount;
    return this.finite(amount);
  }
}

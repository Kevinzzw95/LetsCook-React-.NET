import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NutritionService } from './nutrition.service';

describe('NutritionService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('converts non-numeric USDA nutrient amounts to zero', async () => {
    const service = new NutritionService(new ConfigService({ USDA_API_KEY: 'test-key' }));
    jest.spyOn(axios, 'get')
      .mockResolvedValueOnce({ data: { foods: [{ fdcId: 1, dataType: 'Foundation' }] } })
      .mockResolvedValueOnce({
        data: {
          foodNutrients: [
            { nutrient: { number: '208', name: 'Energy' }, amount: 'not available' },
            { nutrient: { number: '203', name: 'Protein' }, amount: Number.NaN },
            { nutrient: { number: '205', name: 'Carbohydrate' }, amount: Number.POSITIVE_INFINITY },
            { nutrient: { number: '204', name: 'Total lipid' }, amount: undefined },
          ],
        },
      });

    const result = await service.calculate([{ name: 'beef', amount: '100', unit: 'g' }]);

    expect(result).toEqual({ calories: 0, protein: 0, carbohydrate: 0, fat: 0 });
    expect(Object.values(result).every(Number.isFinite)).toBe(true);
  });

  it('normalizes the USDA base URL and retries the next food when a detail ID returns 404', async () => {
    const service = new NutritionService(new ConfigService({
      USDA_API_KEY: 'test-key',
      USDA_BASE_URL: 'https://api.nal.usda.gov/fdc/v1',
    }));
    const missingFood = Object.assign(new Error('Request failed with status code 404'), {
      isAxiosError: true,
      response: { status: 404 },
    });
    const get = jest.spyOn(axios, 'get')
      .mockResolvedValueOnce({
        data: {
          foods: [
            { fdcId: 10, dataType: 'Foundation', score: 10 },
            { fdcId: 20, dataType: 'SR Legacy', score: 9 },
          ],
        },
      })
      .mockRejectedValueOnce(missingFood)
      .mockResolvedValueOnce({
        data: {
          servingSize: 100,
          servingSizeUnit: 'g',
          foodNutrients: [
            { nutrient: { number: '208', name: 'Energy' }, amount: 52 },
            { nutrient: { number: '203', name: 'Protein' }, amount: 10.9 },
            { nutrient: { number: '205', name: 'Carbohydrate' }, amount: 0.73 },
            { nutrient: { number: '204', name: 'Total lipid' }, amount: 0.17 },
          ],
        },
      });

    const result = await service.calculate([{ name: 'Egg white', amount: '100', unit: 'g' }]);

    expect(get.mock.calls.map(([url]) => url)).toEqual([
      'https://api.nal.usda.gov/fdc/v1/foods/search',
      'https://api.nal.usda.gov/fdc/v1/food/10',
      'https://api.nal.usda.gov/fdc/v1/food/20',
    ]);
    expect(result).toEqual({ calories: 52, protein: 10.9, carbohydrate: 0.73, fat: 0.17 });
  });

  it.each([
    ['Pork Collar/Shoulder Butt', 'pork shoulder'],
    ['Doubanjiang (Broad Bean Paste)', 'broad bean paste'],
    ['Chicken Bouillon/MSG', 'chicken bouillon'],
  ])('uses a USDA-friendly search alias for %s', async (name, expectedQuery) => {
    const service = new NutritionService(new ConfigService({ USDA_API_KEY: 'test-key' }));
    const get = jest.spyOn(axios, 'get')
      .mockResolvedValueOnce({ data: { foods: [{ fdcId: 1, dataType: 'Foundation' }] } })
      .mockResolvedValueOnce({ data: { foodNutrients: [] } });

    await service.calculate([{ name, amount: '100', unit: 'g' }]);

    expect((get.mock.calls[0][1] as { params: { query: string } }).params.query).toBe(expectedQuery);
  });

  it('tries another normalized query when USDA rejects the first query', async () => {
    const service = new NutritionService(new ConfigService({ USDA_API_KEY: 'test-key' }));
    const unavailableFood = Object.assign(new Error('Request failed with status code 400'), {
      isAxiosError: true,
      response: { status: 400 },
    });
    const get = jest.spyOn(axios, 'get')
      .mockRejectedValueOnce(unavailableFood)
      .mockResolvedValueOnce({ data: { foods: [{ fdcId: 1, dataType: 'Foundation' }] } })
      .mockResolvedValueOnce({ data: { foodNutrients: [] } });

    await service.calculate([{ name: 'Pork Collar/Shoulder Butt', amount: '100', unit: 'g' }]);

    expect((get.mock.calls[0][1] as { params: { query: string } }).params.query).toBe('pork shoulder');
    expect((get.mock.calls[1][1] as { params: { query: string } }).params.query).toBe('Pork Collar');
    expect(get).toHaveBeenCalledTimes(3);
  });

  it.each([400, 404])('skips an ingredient after every USDA query is unavailable with %i', async (status) => {
    const service = new NutritionService(new ConfigService({ USDA_API_KEY: 'test-key' }));
    const unavailableFood = Object.assign(new Error(`Request failed with status code ${status}`), {
      isAxiosError: true,
      response: { status },
    });
    jest.spyOn(axios, 'get').mockRejectedValue(unavailableFood);

    const result = await service.calculate([{ name: 'Unobtainium', amount: '2', unit: 'g' }]);

    expect(result).toEqual({ calories: 0, protein: 0, carbohydrate: 0, fat: 0 });
  });
});

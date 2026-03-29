using System.Text.Json;
using System.Text.Json.Serialization;
using API.DTOs;
using API.Entity;
using API.Helpers;

namespace API.Services
{
    public class NutritionCalculationService
    {
        private const decimal GramsPerKilogram = 1000m;
        private const decimal GramsPerOunce = 28.349523125m;
        private const decimal GramsPerPound = 453.59237m;
        private const decimal MillilitersPerCup = 240m;
        private const decimal MillilitersPerTablespoon = 14.7868m;
        private const decimal MillilitersPerTeaspoon = 4.92892m;

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<NutritionCalculationService> _logger;

        public NutritionCalculationService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<NutritionCalculationService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task PopulateNutritionAsync(
            Recipe recipe,
            IReadOnlyCollection<CreateIngredientDto> ingredients,
            CancellationToken cancellationToken = default)
        {
            recipe.Calories = 0;
            recipe.Protein = 0;
            recipe.Carbohydrate = 0;
            recipe.Fat = 0;

            if (ingredients.Count == 0)
            {
                return;
            }

            var apiKey = _configuration["Usda:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("USDA ApiKey is not configured. Nutrition totals for recipe {RecipeTitle} will remain zero.", recipe.Title);
                return;
            }

            foreach (var ingredient in ingredients.Where(i => !string.IsNullOrWhiteSpace(i.Name)))
            {
                try
                {
                    var food = await GetBestFoodMatchAsync(ingredient.Name, apiKey, cancellationToken);
                    if (food == null)
                    {
                        continue;
                    }

                    var grams = ResolveWeightInGrams(ingredient, food);
                    if (grams <= 0)
                    {
                        continue;
                    }

                    var nutrientBasisGrams = ResolveNutrientBasisGrams(food);
                    if (nutrientBasisGrams <= 0)
                    {
                        continue;
                    }

                    var scale = grams / nutrientBasisGrams;
                    recipe.Calories += GetNutrientAmount(food.FoodNutrients, "208", "Energy") * scale;
                    recipe.Protein += GetNutrientAmount(food.FoodNutrients, "203", "Protein") * scale;
                    recipe.Carbohydrate += GetNutrientAmount(food.FoodNutrients, "205", "Carbohydrate") * scale;
                    recipe.Fat += GetNutrientAmount(food.FoodNutrients, "204", "Total lipid") * scale;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Unable to calculate nutrition for ingredient {IngredientName}", ingredient.Name);
                }
            }

            recipe.Calories = decimal.Round(recipe.Calories, 2);
            recipe.Protein = decimal.Round(recipe.Protein, 2);
            recipe.Carbohydrate = decimal.Round(recipe.Carbohydrate, 2);
            recipe.Fat = decimal.Round(recipe.Fat, 2);
        }

        private async Task<UsdaFoodDetail?> GetBestFoodMatchAsync(string ingredientName, string apiKey, CancellationToken cancellationToken)
        {
            var searchResponse = await GetFromUsdaAsync<UsdaFoodSearchResponse>(
                $"foods/search?query={Uri.EscapeDataString(ingredientName)}&pageSize=5&api_key={apiKey}",
                cancellationToken);

            var bestMatch = searchResponse?.Foods?
                .OrderBy(food => GetDataTypePriority(food.DataType))
                .ThenByDescending(food => food.Score ?? 0)
                .FirstOrDefault();

            if (bestMatch == null)
            {
                return null;
            }

            return await GetFromUsdaAsync<UsdaFoodDetail>(
                $"food/{bestMatch.FdcId}?api_key={apiKey}",
                cancellationToken);
        }

        private async Task<T?> GetFromUsdaAsync<T>(string requestUri, CancellationToken cancellationToken)
        {
            using var response = await _httpClient.GetAsync(requestUri, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return default;
            }

            await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync<T>(
                responseStream,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                cancellationToken);
        }

        private static int GetDataTypePriority(string? dataType) => dataType switch
        {
            "Foundation" => 0,
            "SR Legacy" => 1,
            "Survey (FNDDS)" => 2,
            "Branded" => 3,
            _ => 4
        };

        private static decimal ResolveWeightInGrams(CreateIngredientDto ingredient, UsdaFoodDetail food)
        {
            var amount = AmountParser.ConvertFractionStringToDecimal(ingredient.Amount);
            if (amount <= 0)
            {
                return 0;
            }

            var normalizedUnit = NormalizeUnit(ingredient.Unit);

            return normalizedUnit switch
            {
                "g" => amount,
                "kg" => amount * GramsPerKilogram,
                "oz" => amount * GramsPerOunce,
                "lb" => amount * GramsPerPound,
                _ => ResolveFromPortionsOrFallback(amount, normalizedUnit, food)
            };
        }

        private static decimal ResolveFromPortionsOrFallback(decimal amount, string unit, UsdaFoodDetail food)
        {
            var matchingPortion = FindMatchingPortion(unit, food.FoodPortions);
            if (matchingPortion?.GramWeight > 0)
            {
                var portionAmount = matchingPortion.Amount > 0 ? matchingPortion.Amount : 1m;
                return amount / portionAmount * matchingPortion.GramWeight;
            }

            return unit switch
            {
                "cup" => amount * MillilitersPerCup,
                "tbsp" => amount * MillilitersPerTablespoon,
                "tsp" => amount * MillilitersPerTeaspoon,
                "ml" => amount,
                "l" => amount * 1000m,
                "piece" or "slice" or "" => food.ServingSize > 0 && IsGramBasedServing(food.ServingSizeUnit)
                    ? amount * food.ServingSize
                    : 0,
                _ => 0
            };
        }

        private static UsdaFoodPortion? FindMatchingPortion(string unit, IEnumerable<UsdaFoodPortion>? portions)
        {
            if (string.IsNullOrWhiteSpace(unit) || portions == null)
            {
                return null;
            }

            var aliases = unit switch
            {
                "cup" => new[] { "cup", "cups" },
                "tbsp" => new[] { "tablespoon", "tablespoons", "tbsp" },
                "tsp" => new[] { "teaspoon", "teaspoons", "tsp" },
                "piece" => new[] { "piece", "pieces", "pc", "pcs", "whole" },
                "slice" => new[] { "slice", "slices" },
                "ml" => new[] { "ml", "milliliter", "milliliters" },
                "l" => new[] { "l", "liter", "liters" },
                _ => new[] { unit }
            };

            return portions.FirstOrDefault(portion =>
            {
                var candidates = new[]
                {
                    portion.MeasureUnit?.Abbreviation,
                    portion.MeasureUnit?.Name,
                    portion.Modifier,
                    portion.PortionDescription
                };

                return candidates.Any(candidate =>
                    !string.IsNullOrWhiteSpace(candidate) &&
                    aliases.Any(alias => candidate.Contains(alias, StringComparison.OrdinalIgnoreCase)));
            });
        }

        private static bool IsGramBasedServing(string? servingUnit) =>
            servingUnit?.Equals("g", StringComparison.OrdinalIgnoreCase) == true ||
            servingUnit?.Equals("gm", StringComparison.OrdinalIgnoreCase) == true ||
            servingUnit?.Equals("gram", StringComparison.OrdinalIgnoreCase) == true ||
            servingUnit?.Equals("grams", StringComparison.OrdinalIgnoreCase) == true;

        private static decimal ResolveNutrientBasisGrams(UsdaFoodDetail food)
        {
            if (food.ServingSize > 0 && IsGramBasedServing(food.ServingSizeUnit))
            {
                return food.ServingSize;
            }

            return 100m;
        }

        private static decimal GetNutrientAmount(IEnumerable<UsdaFoodNutrient>? nutrients, string nutrientNumber, string nutrientNamePrefix)
        {
            if (nutrients == null)
            {
                return 0;
            }

            var nutrient = nutrients.FirstOrDefault(n =>
                string.Equals(n.Nutrient?.Number, nutrientNumber, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrWhiteSpace(n.Nutrient?.Name) &&
                 n.Nutrient.Name.StartsWith(nutrientNamePrefix, StringComparison.OrdinalIgnoreCase)));

            return nutrient?.Amount ?? 0;
        }

        private static string NormalizeUnit(string? unit)
        {
            if (string.IsNullOrWhiteSpace(unit))
            {
                return "";
            }

            return unit.Trim().ToLowerInvariant() switch
            {
                "g" or "gram" or "grams" => "g",
                "kg" or "kilogram" or "kilograms" => "kg",
                "cup" or "cups" => "cup",
                "tbsp" or "tablespoon" or "tablespoons" => "tbsp",
                "tsp" or "teaspoon" or "teaspoons" => "tsp",
                "ml" or "milliliter" or "milliliters" => "ml",
                "l" or "liter" or "liters" => "l",
                "pcs" or "piece" or "pieces" => "piece",
                "slice" or "slices" => "slice",
                "oz" or "ounce" or "ounces" => "oz",
                "lb" or "pound" or "pounds" => "lb",
                var normalized => normalized
            };
        }

        private sealed class UsdaFoodSearchResponse
        {
            [JsonPropertyName("foods")]
            public List<UsdaFoodSearchItem> Foods { get; set; } = [];
        }

        private sealed class UsdaFoodSearchItem
        {
            [JsonPropertyName("fdcId")]
            public long FdcId { get; set; }

            [JsonPropertyName("dataType")]
            public string? DataType { get; set; }

            [JsonPropertyName("score")]
            public decimal? Score { get; set; }
        }

        private sealed class UsdaFoodDetail
        {
            [JsonPropertyName("servingSize")]
            public decimal ServingSize { get; set; }

            [JsonPropertyName("servingSizeUnit")]
            public string? ServingSizeUnit { get; set; }

            [JsonPropertyName("foodNutrients")]
            public List<UsdaFoodNutrient> FoodNutrients { get; set; } = [];

            [JsonPropertyName("foodPortions")]
            public List<UsdaFoodPortion> FoodPortions { get; set; } = [];
        }

        private sealed class UsdaFoodNutrient
        {
            [JsonPropertyName("amount")]
            public decimal Amount { get; set; }

            [JsonPropertyName("nutrient")]
            public UsdaNutrient? Nutrient { get; set; }
        }

        private sealed class UsdaNutrient
        {
            [JsonPropertyName("number")]
            public string? Number { get; set; }

            [JsonPropertyName("name")]
            public string? Name { get; set; }
        }

        private sealed class UsdaFoodPortion
        {
            [JsonPropertyName("amount")]
            public decimal Amount { get; set; }

            [JsonPropertyName("gramWeight")]
            public decimal GramWeight { get; set; }

            [JsonPropertyName("modifier")]
            public string? Modifier { get; set; }

            [JsonPropertyName("portionDescription")]
            public string? PortionDescription { get; set; }

            [JsonPropertyName("measureUnit")]
            public UsdaMeasureUnit? MeasureUnit { get; set; }
        }

        private sealed class UsdaMeasureUnit
        {
            [JsonPropertyName("name")]
            public string? Name { get; set; }

            [JsonPropertyName("abbreviation")]
            public string? Abbreviation { get; set; }
        }
    }
}

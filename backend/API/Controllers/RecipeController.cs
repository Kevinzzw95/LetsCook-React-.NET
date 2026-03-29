using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using API.Entity;
using API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using API.Extensions;
using API.DTOs;
using AutoMapper;
using System.Text.Json;
using API.Services;
using System.Text.RegularExpressions;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace API.Controllers
{
    public class RecipeController : BaseApiController
    { 
        private readonly RecipeContext _context;
        private readonly IMapper _mapper;
        private readonly ImageService _imageService;
        private readonly NutritionCalculationService _nutritionCalculationService;

        public RecipeController(
            RecipeContext _context,
            IMapper _mapper,
            ImageService _imageService,
            NutritionCalculationService nutritionCalculationService)
        {
            this._context = _context;
            this._mapper = _mapper;
            this._imageService = _imageService;
            this._nutritionCalculationService = nutritionCalculationService;
        }

        [Authorize]
        [HttpGet]
        public async Task<ActionResult<List<Recipe>>> GetRecipes()
        {
            var userId = await GetUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var recipes = await _context.Recipes
                .Where(recipe => recipe.UserId == userId)
                .ToListAsync();

            return Ok(recipes.Select(MapRecipeSummaryToDto).ToList());
        }

        [Authorize]
        [HttpGet("search")]
        public async Task<ActionResult<RecipeSearchResponseDto>> SearchRecipes(
            [FromQuery] string? query,
            [FromQuery] string? type,
            [FromQuery] string? cuisine,
            [FromQuery] string? diet,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 12)
        {
            var userId = await GetUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            pageNumber = pageNumber < 1 ? 1 : pageNumber;
            pageSize = pageSize is < 1 or > 50 ? 12 : pageSize;

            var filteredQuery = ApplyRecipeFilters(_context.Recipes.AsNoTracking(), userId, query, type, cuisine, diet);
            var totalCount = await filteredQuery.CountAsync();

            var pagedRecipes = await filteredQuery
                .OrderByDescending(recipe => recipe.UpdatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new RecipeSearchResponseDto
            {
                Items = pagedRecipes.Select(MapRecipeSummaryToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            });
        }

        [Authorize]
        [HttpGet("facets")]
        public async Task<ActionResult<RecipeFacetResponseDto>> GetRecipeFacets(
            [FromQuery] string? query,
            [FromQuery] string? type,
            [FromQuery] string? cuisine,
            [FromQuery] string? diet)
        {
            var userId = await GetUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var filteredRecipes = await ApplyRecipeFilters(_context.Recipes.AsNoTracking(), userId, query, type, cuisine, diet)
                .ToListAsync();

            var response = new RecipeFacetResponseDto
            {
                TotalCount = filteredRecipes.Count,
                Type = filteredRecipes
                    .Where(recipe => !string.IsNullOrWhiteSpace(recipe.DishType))
                    .GroupBy(recipe => recipe.DishType!)
                    .ToDictionary(group => group.Key, group => group.Count()),
                Cuisine = filteredRecipes
                    .Where(recipe => !string.IsNullOrWhiteSpace(recipe.Cuisine))
                    .GroupBy(recipe => recipe.Cuisine!)
                    .ToDictionary(group => group.Key, group => group.Count()),
                Diet = filteredRecipes
                    .SelectMany(recipe => recipe.Diets ?? [])
                    .Where(dietValue => !string.IsNullOrWhiteSpace(dietValue) && dietValue != "None")
                    .GroupBy(dietValue => dietValue)
                    .ToDictionary(group => group.Key, group => group.Count())
            };

            return Ok(response);
        }

        [HttpGet("{id}", Name="GetRecipe")]
        public async Task<ActionResult<RecipeDto>> GetRecipe(long id)
        {
            var recipe = await RetrieveRecipe(id);
            if (recipe == null) return NotFound();

            return Ok(recipe.MapRecipeToDto());
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<RecipeDto>> CreateRecipe([FromForm] CreateRecipeDto createRecipeDto)
        {
            var userId = await GetUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var recipe = _mapper.Map<Recipe>(createRecipeDto);
            recipe.UserId = userId;
            var steps = DeserializeSteps(createRecipeDto.Steps);
            var ingredients = DeserializeIngredients(createRecipeDto.Ingredients);

            await ApplyRecipeFormData(recipe, createRecipeDto, steps, ingredients);
            await _nutritionCalculationService.PopulateNutritionAsync(recipe, ingredients);

            _context.Recipes.Add(recipe);

            var result = await _context.SaveChangesAsync() > 0;

            if (result) return CreatedAtRoute("GetRecipe", new { Id = recipe.Id }, recipe.Id);

            return BadRequest(new ProblemDetails { Title = "Problem creating new recipe" });
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<ActionResult<long>> UpdateRecipe(long id, [FromForm] CreateRecipeDto createRecipeDto)
        {
            var userId = await GetUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var recipe = await _context.Recipes
                .Include(r => r.Instructions)
                .ThenInclude(i => i.Steps)
                .Include(r => r.RecipeIngredients)
                .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

            if (recipe == null) return NotFound();

            recipe.Title = createRecipeDto.Title;
            recipe.Servings = createRecipeDto.Servings;
            recipe.PreparationMinutes = createRecipeDto.PreparationMinutes;
            recipe.CookingMinutes = createRecipeDto.CookingMinutes;
            recipe.SourceName = createRecipeDto.SourceName;
            recipe.SourceUrl = createRecipeDto.SourceUrl;
            recipe.Cuisine = createRecipeDto.Cuisine;
            recipe.DishType = createRecipeDto.DishType;
            recipe.Summary = createRecipeDto.Summary;
            recipe.Diets = createRecipeDto.Diets;
            recipe.UpdatedAt = DateTime.UtcNow;
            var steps = DeserializeSteps(createRecipeDto.Steps);
            var ingredients = DeserializeIngredients(createRecipeDto.Ingredients);

            await ApplyRecipeFormData(recipe, createRecipeDto, steps, ingredients);
            await _nutritionCalculationService.PopulateNutritionAsync(recipe, ingredients);

            var result = await _context.SaveChangesAsync() > 0;
            if (result) return Ok(recipe.Id);

            return BadRequest(new ProblemDetails { Title = "Problem updating recipe" });
        }

        [Authorize]
        [HttpDelete("{id:long}")]
        public async Task<ActionResult> DeleteRecipe(long id)
        {
            var userId = await GetUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var recipe = await _context.Recipes
                .Include(r => r.RecipeIngredients)
                .Include(r => r.Instructions)
                .ThenInclude(i => i.Steps)
                .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId);

            if (recipe == null) return NotFound();

            foreach (var imageKey in recipe.ImageInfo?.Keys.ToList() ?? [])
            {
                var deleteResult = await _imageService.DeleteImageAsync(imageKey);
                if (deleteResult.Error != null)
                {
                    throw new InvalidOperationException(deleteResult.Error.Message);
                }
            }

            _context.Recipes.Remove(recipe);

            var result = await _context.SaveChangesAsync() > 0;
            if (result) return NoContent();

            return BadRequest(new ProblemDetails { Title = "Problem deleting recipe" });
        }

        private async Task<Recipe> RetrieveRecipe(long recipeId)
        {
            return await _context.Recipes
                .Include(i => i.Instructions)
                .ThenInclude(s => s.Steps)
                .Include(recipe => recipe.RecipeIngredients)
                .FirstOrDefaultAsync(x => x.Id == recipeId);
        }

        public static (string quantity, string unit, string name) ParseIngredient(string input)
        {
            var pattern = @"^\s*([\d./]+)\s*([a-zA-Z]+)?\s+(.*)";
            var match = Regex.Match(input, pattern);

            if (match.Success)
            {
                string quantity = match.Groups[1].Value;
                string unit = match.Groups[2].Success ? match.Groups[2].Value : "";
                string name = match.Groups[3].Value;
                return (quantity, unit, name);
            }

            return ("", "", input);
        }

        private async Task<string?> GetUserIdAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userId))
            {
                return userId;
            }

            var username = User.FindFirstValue(ClaimTypes.Name);
            if (string.IsNullOrEmpty(username))
            {
                return null;
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserName == username);
            return user?.Id;
        }

        private static List<StepDto> DeserializeSteps(string serializedSteps) =>
            JsonSerializer.Deserialize<List<StepDto>>(
                serializedSteps,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            ) ?? [];

        private static List<CreateIngredientDto> DeserializeIngredients(string serializedIngredients) =>
            JsonSerializer.Deserialize<List<CreateIngredientDto>>(
                serializedIngredients,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            ) ?? [];

        private static IQueryable<Recipe> ApplyRecipeFilters(
            IQueryable<Recipe> query,
            string userId,
            string? searchQuery,
            string? type,
            string? cuisine,
            string? diet)
        {
            var filteredQuery = query.Where(recipe => recipe.UserId == userId);

            if (!string.IsNullOrWhiteSpace(searchQuery))
            {
                var terms = Regex.Split(searchQuery.Trim(), @"\s+")
                    .Where(term => !string.IsNullOrWhiteSpace(term))
                    .ToArray();

                foreach (var term in terms)
                {
                    var pattern = $"%{term}%";
                    filteredQuery = filteredQuery.Where(recipe =>
                        EF.Functions.ILike(recipe.Title ?? string.Empty, pattern) ||
                        recipe.RecipeIngredients.Any(recipeIngredient =>
                            EF.Functions.ILike(recipeIngredient.DisplayName ?? string.Empty, pattern)));
                }
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                filteredQuery = filteredQuery.Where(recipe => recipe.DishType != null && recipe.DishType.ToLower() == type.ToLower());
            }

            if (!string.IsNullOrWhiteSpace(cuisine))
            {
                filteredQuery = filteredQuery.Where(recipe => recipe.Cuisine != null && recipe.Cuisine.ToLower() == cuisine.ToLower());
            }

            if (!string.IsNullOrWhiteSpace(diet))
            {
                filteredQuery = filteredQuery.Where(recipe => recipe.Diets != null && recipe.Diets.Any(value => value.ToLower() == diet.ToLower()));
            }

            return filteredQuery;
        }

        private static RecipeDto MapRecipeSummaryToDto(Recipe recipe) =>
            new RecipeDto
            {
                Id = recipe.Id,
                Title = recipe.Title,
                ImageUrls = recipe.ImageInfo?.Values.ToList() ?? [],
                Servings = recipe.Servings,
                PreparationMinutes = recipe.PreparationMinutes,
                CookingMinutes = recipe.CookingMinutes,
                SourceName = recipe.SourceName,
                SourceUrl = recipe.SourceUrl,
                Cuisine = recipe.Cuisine,
                Diets = recipe.Diets,
                DishType = recipe.DishType,
                Summary = recipe.Summary,
                Calories = recipe.Calories,
                Protein = recipe.Protein,
                Carbohydrate = recipe.Carbohydrate,
                Fat = recipe.Fat,
            };

        private async Task ApplyRecipeFormData(
            Recipe recipe,
            CreateRecipeDto createRecipeDto,
            List<StepDto> stepsObject,
            List<CreateIngredientDto> ingredientsObject)
        {
            recipe.ImageInfo ??= [];
            var keptImageUrls = JsonSerializer.Deserialize<List<string>>(
                createRecipeDto.ExistingImageUrls ?? "[]",
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            ) ?? [];

            var removedImageKeys = recipe.ImageInfo
                .Where(image => !keptImageUrls.Contains(image.Value))
                .Select(image => image.Key)
                .ToList();

            foreach (var imageKey in removedImageKeys)
            {
                var deleteResult = await _imageService.DeleteImageAsync(imageKey);
                if (deleteResult.Error != null)
                {
                    throw new InvalidOperationException(deleteResult.Error.Message);
                }

                recipe.ImageInfo.Remove(imageKey);
            }

            if (createRecipeDto.Images != null)
            {
                foreach (var image in createRecipeDto.Images)
                {
                    var imageResult = await _imageService.AddImageAsync(image);

                    if (imageResult.Error != null) throw new InvalidOperationException(imageResult.Error.Message);

                    recipe.ImageInfo[imageResult.PublicId] = imageResult.SecureUrl.ToString();
                }
            }

            recipe.Instructions =
            [
                new Instruction {
                    Steps = stepsObject.Select(step => new Step {
                        StepNumber = step.StepNumber,
                        Description = step.Description
                    }).ToList()
                }
            ];

            if (recipe.RecipeIngredients.Count > 0)
            {
                _context.RecipeIngredients.RemoveRange(recipe.RecipeIngredients);
                recipe.RecipeIngredients.Clear();
            }

            for (var index = 0; index < ingredientsObject.Count; index++)
            {
                var ingredient = ingredientsObject[index];
                var normalizedIngredientName = ingredient.Name.Trim();
                var existingIngredient = await _context.Ingredients
                    .FirstOrDefaultAsync(i => i.Name.ToLower() == normalizedIngredientName.ToLower());

                if (existingIngredient == null)
                {
                    var newIngredient = new Ingredient
                    {
                        Name = normalizedIngredientName
                    };
                    _context.Ingredients.Add(newIngredient);
                    await _context.SaveChangesAsync();
                    existingIngredient = newIngredient;
                }

                recipe.RecipeIngredients.Add(new RecipeIngredient
                {
                    IngredientId = existingIngredient.Id,
                    Amount = ingredient.Amount,
                    Unit = ingredient.Unit,
                    DisplayName = existingIngredient.Name,
                    DisplayImage = existingIngredient.Image,
                    Original = BuildOriginalIngredientText(ingredient),
                    SortOrder = index
                });
            }
        }

        private static string BuildOriginalIngredientText(CreateIngredientDto ingredient)
        {
            var parts = new[]
            {
                ingredient.Amount?.Trim(),
                ingredient.Unit?.Trim(),
                ingredient.Name?.Trim()
            }
            .Where(part => !string.IsNullOrWhiteSpace(part));

            return string.Join(" ", parts);
        }
    }
}

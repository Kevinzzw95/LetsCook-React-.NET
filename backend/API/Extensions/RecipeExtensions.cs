using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using API.DTOs;
using API.Entity;

namespace API.Extensions
{
    public static class RecipeExtensions
    {
        public static List<ExtendedIngredientDto> MapRecipeIngredientsToDto(this Recipe recipe) =>
            recipe.RecipeIngredients
                .OrderBy(recipeIngredient => recipeIngredient.SortOrder)
                .Select(recipeIngredient => new ExtendedIngredientDto
                {
                    Id = recipeIngredient.IngredientId,
                    Consistency = recipeIngredient.Consistency,
                    Original = recipeIngredient.Original,
                    Amount = recipeIngredient.Amount,
                    Unit = recipeIngredient.Unit,
                    Name = recipeIngredient.DisplayName,
                    Image = recipeIngredient.DisplayImage
                })
                .ToList();

        public static RecipeDto MapRecipeToDto(this Recipe recipe)
        {

            return new RecipeDto
            {
                Id = recipe.Id,
                Title = recipe.Title,
                ImageUrls = recipe.ImageInfo?.Values?.ToList() ?? [],
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
                CreatedAt = recipe.CreatedAt,
                UpdatedAt = recipe.UpdatedAt,
                UserId = recipe.UserId,
                ExtendedIngredients = recipe.MapRecipeIngredientsToDto(),
                Instructions = recipe.Instructions.Select(instruction => 
                    new InstructionDto {
                        Name = instruction.Name,
                        Steps = instruction.Steps.Select(step => new StepDto
                            {
                                StepNumber = step.StepNumber,
                                Description = step.Description
                            }).ToList()
                        }
                ).ToList()
                
            };
        }

        public static ShoppingListDto MapShoppingListToDto(this ShoppingList shoppingList)
        {
            return new ShoppingListDto
            {
                UserId = shoppingList.UserId,
                Items = shoppingList.Items.Select(item => new ShoppingItemDto
                {
                    ItemId = item.Id,
                    Name = item.Ingredient.Name,
                    Image = item.Ingredient.Image,
                    Amount = item.Amount,
                    Unit = item.Unit,                
                    Store = item.Store,
                    IsBought = item.IsBought
                }).ToList()
            };
        }
    }
}

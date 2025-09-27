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
        public static RecipeDto MapRecipeToDto(this Recipe recipe)
        {

            return new RecipeDto
            {
                Id = recipe.Id,
                Title = recipe.Title,
                //Image = recipe.Image,
                Servings = recipe.Servings,
                CookingMinutes = recipe.CookingMinutes,
                SourceName = recipe.SourceName,
                SourceUrl = recipe.SourceUrl,
                Cuisine = recipe.Cuisine,
                Diets = recipe.Diets,
                DishType = recipe.DishType,
                Summary = recipe.Summary,
                CreatedAt = recipe.CreatedAt,
                UpdatedAt = recipe.UpdatedAt,
                UserId = recipe.UserId,
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
    }
}
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

namespace API.Controllers
{
    public class RecipeController : BaseApiController
    { 
        private readonly RecipeContext _context;
        private readonly IMapper _mapper;
        private readonly ImageService _imageService;

        public RecipeController(RecipeContext _context, IMapper _mapper, ImageService _imageService)
        {
            this._context = _context;
            this._mapper = _mapper;
            this._imageService = _imageService;
        }

        [HttpGet]
        public async Task<ActionResult<List<Recipe>>> GetRecipes()
        {
            var recipes = await _context.Recipes.ToListAsync();
            var recipeSimpleList = from recipe in recipes
                                select new RecipeDto
                                {
                                    Id = recipe.Id,
                                    Title = recipe.Title,
                                    ImageUrls = recipe.ImageInfo?.Values?.ToList(),
                                    Servings = recipe.Servings,
                                    CookingMinutes = recipe.CookingMinutes,

                                    SourceName = recipe.SourceName,
                                    SourceUrl = recipe.SourceUrl,

                                    Cuisine = recipe.Cuisine,
                                    Diets = recipe.Diets?.ToList(),

                                    DishType = recipe.DishType,
                                    Summary = recipe.Summary,
                                };
            return Ok(recipeSimpleList.ToList());
        }

        [HttpGet("{id}", Name="GetRecipe")]
        public async Task<ActionResult<RecipeDto>> GetRecipe(long id)
        {
            var recipe = await RetrieveRecipe(id);

            var ingredientIds = recipe.ExtendedIngredientsList.Select(ingredient => ingredient.Id).ToList();
            var ingredients = await _context.Ingredients
            .Where(i => ingredientIds.Contains(i.Id))
            .ToListAsync();
            
            if (recipe == null) return NotFound();

            var combinedList = from ei in recipe.ExtendedIngredientsList
                            join i in ingredients on ei.Id equals i.Id
                            select new ExtendedIngredientDto
                            {
                                Id = i.Id,
                                Name = i.Name,
                                Image = i.Image,
                                Consistency = ei.Consistency,
                                Original = ei.Original,
                                Amount = ei.Amount,
                                Unit = ei.Unit
                            };
            var recipeDto = recipe.MapRecipeToDto();
            recipeDto.ExtendedIngredients = combinedList.ToList();
            
            // The ExtendedIngredientsList property will automatically handle the conversion
            return Ok(recipeDto);
        }

        [HttpPost]
        public async Task<ActionResult<RecipeDto>> CreateRecipe([FromForm] CreateRecipeDto createRecipeDto)
        {
            var recipe = _mapper.Map<Recipe>(createRecipeDto);

            if (createRecipeDto.Images != null)
            {
                recipe.ImageInfo = [];
                foreach(var image in createRecipeDto.Images) {
                    var imageResult = await _imageService.AddImageAsync(image);

                    if (imageResult.Error != null) return BadRequest(new ProblemDetails { Title = imageResult.Error.Message });

                    recipe.ImageInfo.Add(imageResult.PublicId, imageResult.SecureUrl.ToString());
                }     
            }

            var stepsObject = JsonSerializer.Deserialize<List<StepDto>>(
                createRecipeDto.Steps,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );
            recipe.Instructions =
            [
                new Instruction {
                    Steps = stepsObject.Select(step => new Step {
                        StepNumber = step.StepNumber,
                        Description = step.Description
                    }).ToList()
                }
            ];

            var recipeIngredients = new List<object>();
            var ingredientsObject = JsonSerializer.Deserialize<List<CreateIngredientDto>>(
                createRecipeDto.Ingredients,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );
            foreach (var ingredient in ingredientsObject) {
                
                var existingIngredient = await _context.Ingredients.FirstOrDefaultAsync(i => i.Name == ingredient.Name);
                if(existingIngredient == null) {
                    var newIngredient = new Ingredient {
                        Name = ingredient.Name
                    };
                    _context.Ingredients.Add(newIngredient);
                    var ingredientResult = await _context.SaveChangesAsync() > 0;
                    if(ingredientResult) {
                        existingIngredient = newIngredient;
                    }    
                }
                var recipeIngredient = new ExtendedIngredient{
                    Id = existingIngredient.Id,
                    Amount = ingredient.Amount,
                    Unit = ingredient.Unit
                };
                recipeIngredients.Add(recipeIngredient);
            }

            recipe.ExtendedIngredients = JsonSerializer.Serialize(recipeIngredients);

            _context.Recipes.Add(recipe);

            var result = await _context.SaveChangesAsync() > 0;

            if (result) return CreatedAtRoute("GetRecipe", new { Id = recipe.Id }, recipe.Id);

            return BadRequest(new ProblemDetails { Title = "Problem creating new recipe" });
        }

        private async Task<Recipe> RetrieveRecipe(long recipeId)
        {
            return await _context.Recipes
                .Include(i => i.Instructions)
                .ThenInclude(s => s.Steps)
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
    }
}

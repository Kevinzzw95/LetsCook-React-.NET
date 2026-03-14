using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using API.Data;
using API.DTOs;
using API.Extensions;
using API.Entity;
using API.Services;
using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace API.Controllers
{
    [Authorize]
    public class ShoppingListController : BaseApiController
    {
        private readonly RecipeContext _context;
        private readonly IMapper _mapper;
        private readonly ImageService _imageService;

        public ShoppingListController(RecipeContext _context, IMapper _mapper, ImageService _imageService)
        {
            this._context = _context;
            this._mapper = _mapper;
        }

        [HttpGet(Name = "GetShoppingList")]
        public async Task<ActionResult<ShoppingListDto>> GetShoppingList()
        {
            var shoppingList = await RetrieveShoppingList(await GetUserIdAsync());
            if (shoppingList == null) shoppingList = await CreateShoppingList();

            return shoppingList.MapShoppingListToDto();
        }

        [HttpPut("{itemId}")]
        public async Task<IActionResult> UpdateItem(long itemId, [FromBody] UpdateShoppingItemDto updateShoppingItemDto)
        {
            /* if (updateShoppingItemDto.Amount <= 0)
                return BadRequest("Quantity must be greater than 0."); */

            var userId = await GetUserIdAsync();

            // Example: get user from auth
            var item = await _context.ShoppingItems
                .FirstOrDefaultAsync(i =>
                    i.Id == itemId &&
                    i.ShoppingList.UserId == userId);

            if (item == null)
                return NotFound();

            item.Amount = updateShoppingItemDto.Amount;
            item.Unit = updateShoppingItemDto.Unit;
            item.Store = updateShoppingItemDto.Store;
            item.IsBought = updateShoppingItemDto.IsBought;

            await _context.SaveChangesAsync();

            return Ok(item);
        }

        [HttpPost]
        public async Task<ActionResult<ShoppingItemDto>> AddItemToShoppingList([FromForm] CreateShoppingItemDto createShoppingItemDto)
        {
            var shoppingList = await RetrieveShoppingList(await GetUserIdAsync());
            if (shoppingList == null) shoppingList = await CreateShoppingList();

            var ingredient = await _context.Ingredients.FindAsync(createShoppingItemDto.IngredientId);
            if (ingredient == null) return BadRequest(new ProblemDetails { Title = "Ingredient Not Found" });

            shoppingList.AddItem(ingredient, createShoppingItemDto.Amount, createShoppingItemDto.Unit);

            var result = await _context.SaveChangesAsync() > 0;
            if (result) return CreatedAtRoute("GetShoppingList", shoppingList.MapShoppingListToDto());

            return BadRequest(new ProblemDetails { Title = "Problem saving item to shopping list" });
            
        }

        [HttpPost("meal-plan-days")]
        public async Task<ActionResult<AddMealPlanDaysToShoppingListResultDto>> AddMealPlanDaysToShoppingList([FromBody] AddMealPlanDaysToShoppingListDto addMealPlanDaysToShoppingListDto)
        {
            var userId = await GetUserIdAsync();
            var selectedDates = addMealPlanDaysToShoppingListDto.PlannedDates
                .Select(date => DateTime.SpecifyKind(date.Date, DateTimeKind.Utc))
                .Distinct()
                .ToList();

            if (selectedDates.Count == 0)
            {
                return BadRequest(new ProblemDetails { Title = "At least one planned date is required." });
            }

            var shoppingList = await RetrieveShoppingList(userId);
            if (shoppingList == null) shoppingList = await CreateShoppingList();

            var mealPlanEntries = await _context.MealPlanEntries
                .AsNoTracking()
                .Include(entry => entry.Recipe)
                .Where(entry => entry.UserId == userId && selectedDates.Contains(entry.PlannedDate))
                .ToListAsync();

            if (mealPlanEntries.Count == 0)
            {
                return Ok(new AddMealPlanDaysToShoppingListResultDto
                {
                    SelectedDaysCount = selectedDates.Count,
                    AddedItemsCount = 0
                });
            }

            var addedItemsCount = await AddRecipeIngredientsToShoppingList(
                shoppingList,
                mealPlanEntries.Select(entry => entry.Recipe).ToList()
            );

            var result = await _context.SaveChangesAsync() > 0;
            if (!result)
            {
                return BadRequest(new ProblemDetails { Title = "Problem adding planned ingredients to shopping list" });
            }

            return Ok(new AddMealPlanDaysToShoppingListResultDto
            {
                SelectedDaysCount = selectedDates.Count,
                AddedItemsCount = addedItemsCount
            });
        }

        [HttpPost("recipe/{recipeId:long}")]
        public async Task<ActionResult<AddMealPlanDaysToShoppingListResultDto>> AddRecipeIngredientsToShoppingList(long recipeId)
        {
            var shoppingList = await RetrieveShoppingList(await GetUserIdAsync());
            if (shoppingList == null) shoppingList = await CreateShoppingList();

            var recipe = await _context.Recipes.FindAsync(recipeId);
            if (recipe == null)
            {
                return NotFound();
            }

            var addedItemsCount = await AddRecipeIngredientsToShoppingList(shoppingList, [recipe]);

            var result = await _context.SaveChangesAsync() > 0;
            if (!result)
            {
                return BadRequest(new ProblemDetails { Title = "Problem adding recipe ingredients to shopping list" });
            }

            return Ok(new AddMealPlanDaysToShoppingListResultDto
            {
                SelectedDaysCount = 0,
                AddedItemsCount = addedItemsCount
            });
        }

        private async Task<ShoppingList> RetrieveShoppingList(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                Response.Cookies.Delete("userId");
                return null;
            }

            return await _context.ShoppingLists
                .Include(i => i.Items)
                .ThenInclude(ing => ing.Ingredient)
                .FirstOrDefaultAsync(x => x.UserId== userId);
        }

        private async Task<ShoppingList> CreateShoppingList()
        {
            var userId = await GetUserIdAsync();
            if (string.IsNullOrEmpty(userId))
            {
                userId = Guid.NewGuid().ToString();
                var cookieOptions = new CookieOptions { IsEssential = true, Expires = DateTime.Now.AddDays(30) };
                Response.Cookies.Append("userId", userId, cookieOptions);
            }

            var shoppingList = new ShoppingList { UserId = userId };
            _context.ShoppingLists.Add(shoppingList);
            return shoppingList;
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

        private async Task<int> AddRecipeIngredientsToShoppingList(ShoppingList shoppingList, List<Recipe> recipes)
        {
            var ingredientIds = recipes
                .SelectMany(recipe => recipe.ExtendedIngredientsList)
                .Select(ingredient => ingredient.Id)
                .Distinct()
                .ToList();

            if (ingredientIds.Count == 0)
            {
                return 0;
            }

            var ingredients = await _context.Ingredients
                .Where(ingredient => ingredientIds.Contains(ingredient.Id))
                .ToDictionaryAsync(ingredient => ingredient.Id);

            var addedItemsCount = 0;

            foreach (var recipe in recipes)
            {
                foreach (var recipeIngredient in recipe.ExtendedIngredientsList)
                {
                    if (!ingredients.TryGetValue(recipeIngredient.Id, out var ingredient))
                    {
                        continue;
                    }

                    shoppingList.AddItem(ingredient, recipeIngredient.Amount, recipeIngredient.Unit);
                    addedItemsCount++;
                }
            }

            return addedItemsCount;
        }
    }
}

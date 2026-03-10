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
            var shoppingList = await RetrieveShoppingList(GetUserId());
            if (shoppingList == null) shoppingList = CreateShoppingList();

            return shoppingList.MapShoppingListToDto();
        }

        [HttpPut("{itemId}")]
        public async Task<IActionResult> UpdateItem(long itemId, [FromBody] UpdateShoppingItemDto updateShoppingItemDto)
        {
            /* if (updateShoppingItemDto.Amount <= 0)
                return BadRequest("Quantity must be greater than 0."); */

            var userId = User.Identity?.Name;

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
            var shoppingList = await RetrieveShoppingList(GetUserId());
            if (shoppingList == null) shoppingList = CreateShoppingList();

            var ingredient = await _context.Ingredients.FindAsync(createShoppingItemDto.IngredientId);
            if (ingredient == null) return BadRequest(new ProblemDetails { Title = "Ingredient Not Found" });

            shoppingList.AddItem(ingredient, createShoppingItemDto.Amount, createShoppingItemDto.Unit);

            var result = await _context.SaveChangesAsync() > 0;
            if (result) return CreatedAtRoute("GetShoppingList", shoppingList.MapShoppingListToDto());

            return BadRequest(new ProblemDetails { Title = "Problem saving item to shopping list" });
            
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

        private ShoppingList CreateShoppingList()
        {
            var userId = User.Identity?.Name;
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

        private string GetUserId()
        {
            return User.Identity!.Name!;
        }
    }
}
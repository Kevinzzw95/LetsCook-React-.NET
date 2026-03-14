using API.Data;
using API.DTOs;
using API.Entity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API.Controllers
{
    [Authorize]
    public class MealPlanController : BaseApiController
    {
        private readonly RecipeContext _context;

        public MealPlanController(RecipeContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<List<MealPlanEntryDto>>> GetMealPlanEntries([FromQuery] int year, [FromQuery] int month)
        {
            if (month < 1 || month > 12)
            {
                return BadRequest(new ProblemDetails { Title = "Month must be between 1 and 12." });
            }

            var start = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
            var end = start.AddMonths(1);
            var userId = GetUserId();

            var entries = await _context.MealPlanEntries
                .AsNoTracking()
                .Include(entry => entry.Recipe)
                .Where(entry => entry.UserId == userId && entry.PlannedDate >= start && entry.PlannedDate < end)
                .OrderBy(entry => entry.PlannedDate)
                .ThenBy(entry => entry.MealType)
                .Select(entry => new MealPlanEntryDto
                {
                    Id = entry.Id,
                    PlannedDate = entry.PlannedDate,
                    MealType = entry.MealType,
                    RecipeId = entry.RecipeId,
                    RecipeTitle = entry.Recipe.Title,
                    RecipeImageUrl = entry.Recipe.ImageInfo != null ? entry.Recipe.ImageInfo.Values.FirstOrDefault() : null,
                    Servings = entry.Recipe.Servings,
                    CookingMinutes = entry.Recipe.CookingMinutes
                })
                .ToListAsync();

            return Ok(entries);
        }

        [HttpPost]
        public async Task<ActionResult<MealPlanEntryDto>> UpsertMealPlanEntry([FromBody] MealPlanUpsertDto mealPlanUpsertDto)
        {
            var userId = GetUserId();
            var plannedDate = DateTime.SpecifyKind(mealPlanUpsertDto.PlannedDate.Date, DateTimeKind.Utc);
            var mealType = mealPlanUpsertDto.MealType.Trim().ToLowerInvariant();

            var recipe = await _context.Recipes.FindAsync(mealPlanUpsertDto.RecipeId);
            if (recipe == null)
            {
                return BadRequest(new ProblemDetails { Title = "Recipe not found." });
            }

            var entry = new MealPlanEntry
            {
                UserId = userId,
                PlannedDate = plannedDate,
                MealType = mealType,
                RecipeId = recipe.Id
            };

            _context.MealPlanEntries.Add(entry);

            var result = await _context.SaveChangesAsync() > 0;
            if (!result)
            {
                return BadRequest(new ProblemDetails { Title = "Problem saving meal plan entry." });
            }

            return Ok(new MealPlanEntryDto
            {
                Id = entry.Id,
                PlannedDate = entry.PlannedDate,
                MealType = entry.MealType,
                RecipeId = recipe.Id,
                RecipeTitle = recipe.Title,
                RecipeImageUrl = recipe.ImageInfo != null ? recipe.ImageInfo.Values.FirstOrDefault() : null,
                Servings = recipe.Servings,
                CookingMinutes = recipe.CookingMinutes
            });
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> DeleteMealPlanEntry(long id)
        {
            var entry = await _context.MealPlanEntries
                .FirstOrDefaultAsync(existing => existing.Id == id && existing.UserId == GetUserId());

            if (entry == null)
            {
                return NotFound();
            }

            _context.MealPlanEntries.Remove(entry);

            var result = await _context.SaveChangesAsync() > 0;
            if (!result)
            {
                return BadRequest(new ProblemDetails { Title = "Problem deleting meal plan entry." });
            }

            return NoContent();
        }

        private string GetUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        }
    }
}

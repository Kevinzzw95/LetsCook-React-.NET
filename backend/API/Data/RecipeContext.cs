using API.Entity;
using Microsoft.EntityFrameworkCore;  
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Identity;

namespace API.Data
{
    public class RecipeContext : IdentityDbContext<User>
    {
        public RecipeContext(DbContextOptions<RecipeContext> options) : base(options)
        {
        }

        public DbSet<Recipe> Recipes { get; set; }
        public DbSet<Ingredient> Ingredients { get; set; }
        public DbSet<RecipeIngredient> RecipeIngredients { get; set; }
        public DbSet<ShoppingList> ShoppingLists { get; set; }
        public DbSet<ShoppingItem> ShoppingItems { get; set; }
        public DbSet<MealPlanEntry> MealPlanEntries { get; set; }
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Recipe>()
                .HasMany(recipe => recipe.RecipeIngredients)
                .WithOne(recipeIngredient => recipeIngredient.Recipe)
                .HasForeignKey(recipeIngredient => recipeIngredient.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<RecipeIngredient>()
                .HasOne(recipeIngredient => recipeIngredient.Ingredient)
                .WithMany(ingredient => ingredient.RecipeIngredients)
                .HasForeignKey(recipeIngredient => recipeIngredient.IngredientId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<RecipeIngredient>()
                .HasIndex(recipeIngredient => new { recipeIngredient.RecipeId, recipeIngredient.SortOrder });

            builder.Entity<MealPlanEntry>()
                .HasOne(entry => entry.Recipe)
                .WithMany()
                .HasForeignKey(entry => entry.RecipeId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<IdentityRole>()
                .HasData(
                    new IdentityRole { Id = "1", Name = "Member", NormalizedName = "MEMBER" },
                    new IdentityRole { Id = "2", Name = "Admin", NormalizedName = "ADMIN" }
                );
        }
    }
}

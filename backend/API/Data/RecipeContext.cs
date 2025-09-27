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
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<IdentityRole>()
                .HasData(
                    new IdentityRole { Id = "1", Name = "Member", NormalizedName = "MEMBER" },
                    new IdentityRole { Id = "2", Name = "Admin", NormalizedName = "ADMIN" }
                );
        }
    }
}
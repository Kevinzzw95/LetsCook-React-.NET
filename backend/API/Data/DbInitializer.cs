using System.Threading.Tasks;
using API.Entity;
using Microsoft.AspNetCore.Identity;

namespace API.Data
{
    public class DbInitializer
    {
        public static async Task Initialize(RecipeContext context, UserManager<User> userManager)
        {
            //context.Database.EnsureCreated();

            if (!userManager.Users.Any())
            {
                var user = new User
                {
                    UserName = "Kevin",
                    Email = "kevinzzw95@gmail.com"
                };

                await userManager.CreateAsync(user, "P4$$w0rd");
                await userManager.AddToRoleAsync(user, "Member");

                var admin = new User
                {
                    UserName = "admin",
                    Email = "admin@test.com"
                };

                await userManager.CreateAsync(admin, "P4$$w0rd");
                await userManager.AddToRolesAsync(admin, new[] { "Member", "Admin" });
            }

            if (context.Recipes.Any()) return;

            // First seed ingredients if empty
            if (!context.Ingredients.Any())
            {
                var ingredients = new Entity.Ingredient[]
                {
                    new Entity.Ingredient
                    {
                        Id = 1001,
                        Name = "fresh mozzarella",
                        Image = "fresh-mozzarella.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 11529,
                        Name = "tomatoes",
                        Image = "tomato.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 2044,
                        Name = "fresh basil",
                        Image = "basil.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 15076,
                        Name = "salmon fillet",
                        Image = "salmon.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 20444,
                        Name = "rice",
                        Image = "rice.jpg"
                    },
                    // Additional common ingredients
                    new Entity.Ingredient
                    {
                        Id = 11282,
                        Name = "onion",
                        Image = "onion.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 11215,
                        Name = "garlic",
                        Image = "garlic.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 11821,
                        Name = "bell pepper",
                        Image = "bell-pepper.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 2047,
                        Name = "salt",
                        Image = "salt.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 1002030,
                        Name = "black pepper",
                        Image = "black-pepper.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 4053,
                        Name = "olive oil",
                        Image = "olive-oil.jpg"
                    },
                    new Entity.Ingredient
                    {
                        Id = 11549,
                        Name = "marinara sauce",
                        Image = "marinara-sauce.jpg"
                    }
                };

                context.Ingredients.AddRange(ingredients);
                context.SaveChanges();
            }

            // Then seed recipes if empty
            if (!context.Recipes.Any())
            {
                var recipes = new Entity.Recipe[]
                {
                    new Entity.Recipe {
                        Title = "Classic Margherita Pizza",
                        Servings = 4,
                        CookingMinutes = 15,
                        SourceName = "Food Blog",
                        SourceUrl = "https://example.com/margherita-pizza",
                        Diets = new List<string>{ "vegetarian" },
                        Instructions = new List<Instruction> {
                            new Instruction {
                                Name = "Instruction 1",
                                Steps = new List<Step>
                                {
                                    new Step
                                    {
                                        StepNumber = 1,
                                        Description = "Make the pizza dough."
                                    },
                                    new Step
                                    {
                                        StepNumber = 2,
                                        Description = "Prepare tomato sauce."
                                    },
                                    new Step
                                    {
                                        StepNumber = 3,
                                        Description = "Top with fresh mozzarella and basil."
                                    },
                                    new Step
                                    {
                                        StepNumber = 4,
                                        Description = "Bake at 450°F for 12-15 minutes."
                                    }
                                }
                            }
                        },
                        //DishTypes = new[] { "lunch", "dinner", "main course" },
                        ExtendedIngredients = @"[
                            {
                                ""Id"": 1001,
                                ""Consistency"": ""solid"",
                                ""Original"": ""8 oz fresh mozzarella"",
                                ""Amount"": 8.0,
                                ""Unit"": ""oz""
                            },
                            {
                                ""Id"": 11529,
                                ""Consistency"": ""solid"",
                                ""Original"": ""2 ripe tomatoes"",
                                ""Amount"": 2.0,
                                ""Unit"": """"
                            },
                            {
                                ""Id"": 2044,
                                ""Consistency"": ""solid"",
                                ""Original"": ""Fresh basil leaves"",
                                ""Amount"": 6.0,
                                ""Unit"": ""leaves""
                            }
                        ]",
                        Summary = "A classic Neapolitan pizza with fresh mozzarella, tomatoes, and basil.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        UserId = "system"
                    },
                    new Entity.Recipe {
                        Title = "Teriyaki Salmon Bowl",
                        Servings = 2,
                        CookingMinutes = 20,
                        SourceName = "Healthy Recipes Blog",
                        SourceUrl = "https://example.com/teriyaki-salmon",
                        Diets = new List<string>{ "pescatarian", "dairy-free" },
                        Instructions = new List<Instruction> {
                            new Instruction {
                                Name = "",
                                Steps = new List<Step>
                                {
                                    new Step
                                    {
                                        StepNumber = 1,
                                        Description = "Cook rice."
                                    },
                                    new Step
                                    {
                                        StepNumber = 2,
                                        Description = "Marinate salmon in teriyaki sauce."
                                    },
                                    new Step
                                    {
                                        StepNumber = 3,
                                        Description = "Pan-sear salmon."
                                    },
                                    new Step
                                    {
                                        StepNumber = 4,
                                        Description = "Steam vegetables\n5. Assemble bowl with rice, salmon, and vegetables."
                                    }
                                }
                            }
                        },
                        //DishTypes = new[] { "lunch", "dinner", "bowl" },
                        ExtendedIngredients = @"[
                            {
                                ""Id"": 15076,
                                ""Consistency"": ""solid"",
                                ""Original"": ""2 6-oz salmon fillets"",
                                ""Amount"": 2.0,
                                ""Unit"": ""fillet""
                            },
                            {
                                ""Id"": 20444,
                                ""Consistency"": ""solid"",
                                ""Original"": ""1 cup rice"",
                                ""Amount"": 1.0,
                                ""Unit"": ""cup""
                            }
                        ]",
                        Summary = "A healthy and delicious salmon bowl with homemade teriyaki sauce.",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        UserId = "system"
                    }
                };

                context.Recipes.AddRange(recipes);
                context.SaveChanges();
            }
        }
    }
}
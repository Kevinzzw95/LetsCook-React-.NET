namespace API.Entity
{
    public class Recipe
    {
        private static readonly ILogger<Recipe> _logger = 
            LoggerFactory.Create(builder => builder.AddConsole())
                        .CreateLogger<Recipe>();

        public long Id { get; set; }
        public string Title { get; set; }
        public Dictionary<string, string> ImageInfo { get; set; }
        public int Servings { get; set; }
        public int PreparationMinutes { get; set; }
        public int CookingMinutes { get; set; }
        public string SourceName { get; set; }
        public string SourceUrl { get; set; }
        public string Cuisine { get; set; }
        public List<string> Diets { get; set; }
        public List<Instruction> Instructions { get; set; }
        public string DishType { get; set; }
        public string Summary { get; set; }

        // Store the JSON string in database but exclude from API response
        [System.Text.Json.Serialization.JsonIgnore]
        public string ExtendedIngredients { get; set; }

        // Used for API responses
        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        [System.Text.Json.Serialization.JsonPropertyName("extendedIngredients")]
        public List<ExtendedIngredient> ExtendedIngredientsList 
        {
            get => GetIngredientsAsList();
            set => ExtendedIngredients = System.Text.Json.JsonSerializer.Serialize(value);
        }

        // Keeping tracking fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string UserId { get; set; }

        private List<ExtendedIngredient> GetIngredientsAsList()
        {
            try 
            {
                if (string.IsNullOrEmpty(ExtendedIngredients))
                {
                    _logger.LogInformation("ExtendedIngredients is empty for recipe {RecipeId} - {Title}, returning empty list", 
                        Id, Title);
                    return new List<ExtendedIngredient>();
                }
                
                _logger.LogInformation("Deserializing ExtendedIngredients for recipe {RecipeId} - {Title}: {Json}", 
                    Id, Title, ExtendedIngredients);
                var result = System.Text.Json.JsonSerializer.Deserialize<List<ExtendedIngredient>>(ExtendedIngredients);
                _logger.LogInformation("Successfully deserialized {Count} ingredients for recipe {RecipeId} - {result}", 
                    result?.Count ?? 0, Id, result);
                return result ?? new List<ExtendedIngredient>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deserializing ExtendedIngredients for recipe {RecipeId} - {Title}: {Message}", 
                    Id, Title, ex.Message);
                return new List<ExtendedIngredient>();
            }
        }
    }
}

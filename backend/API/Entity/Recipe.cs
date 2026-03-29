namespace API.Entity
{
    public class Recipe
    {
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
        public decimal Calories { get; set; }
        public decimal Protein { get; set; }
        public decimal Carbohydrate { get; set; }
        public decimal Fat { get; set; }
        public List<RecipeIngredient> RecipeIngredients { get; set; } = [];

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string UserId { get; set; }
    }
}

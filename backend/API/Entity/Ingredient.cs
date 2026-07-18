namespace API.Entity
{
    public class Ingredient
    {
        public long Id { get; set; }
        public string Name { get; set; }
        public string Image { get; set; }
        public string? CanonicalNameEn { get; set; }
        public string? NormalizedCanonicalName { get; set; }
        public string? UsdaDescription { get; set; }
        public long? UsdaFdcId { get; set; }
        public List<RecipeIngredient> RecipeIngredients { get; set; } = [];
        public List<IngredientAlias> Aliases { get; set; } = [];
    }
} 

namespace API.Entity
{
    public class RecipeIngredient
    {
        public long Id { get; set; }
        public long RecipeId { get; set; }
        public Recipe Recipe { get; set; }
        public long IngredientId { get; set; }
        public Ingredient Ingredient { get; set; }
        public string Amount { get; set; }
        public string Unit { get; set; }
        public string? Consistency { get; set; }
        public string? Original { get; set; }
        public string DisplayName { get; set; }
        public string? DisplayImage { get; set; }
        public int SortOrder { get; set; }
    }
}

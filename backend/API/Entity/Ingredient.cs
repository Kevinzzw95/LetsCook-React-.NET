namespace API.Entity
{
    public class Ingredient
    {
        public long Id { get; set; }
        public string Name { get; set; }
        public string Image { get; set; }
        public List<RecipeIngredient> RecipeIngredients { get; set; } = [];
    }
} 

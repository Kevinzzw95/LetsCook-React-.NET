namespace API.DTOs
{
    public class MealPlanEntryDto
    {
        public long Id { get; set; }
        public DateTime PlannedDate { get; set; }
        public string MealType { get; set; }
        public long RecipeId { get; set; }
        public string RecipeTitle { get; set; }
        public string RecipeImageUrl { get; set; }
        public int Servings { get; set; }
        public int CookingMinutes { get; set; }
    }
}

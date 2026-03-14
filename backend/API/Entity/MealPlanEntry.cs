namespace API.Entity
{
    public class MealPlanEntry
    {
        public long Id { get; set; }
        public string UserId { get; set; }
        public DateTime PlannedDate { get; set; }
        public string MealType { get; set; }
        public long RecipeId { get; set; }
        public Recipe Recipe { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}

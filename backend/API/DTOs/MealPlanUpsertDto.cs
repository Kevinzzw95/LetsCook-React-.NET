using System.ComponentModel.DataAnnotations;

namespace API.DTOs
{
    public class MealPlanUpsertDto
    {
        [Required]
        public DateTime PlannedDate { get; set; }

        [Required]
        [RegularExpression("breakfast|lunch|dinner")]
        public string MealType { get; set; }

        [Required]
        public long RecipeId { get; set; }
    }
}

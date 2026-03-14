using System.ComponentModel.DataAnnotations;

namespace API.DTOs
{
    public class AddMealPlanDaysToShoppingListDto
    {
        [Required]
        public List<DateTime> PlannedDates { get; set; } = [];
    }
}

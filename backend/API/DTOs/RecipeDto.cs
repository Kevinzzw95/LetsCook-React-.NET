using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using API.DTOs;

namespace API.DTOs
{
    public class RecipeDto
    {
        public long Id { set; get; }
        public string Title { get; set; }
        public List<string> ImageUrls { get; set; }
        public int Servings { get; set; }
        public int CookingMinutes { get; set; }
        public string SourceName { get; set; }
        public string SourceUrl { get; set; }
        public string Cuisine { get; set; }
        public List<string> Diets { get; set; }
        public List<InstructionDto> Instructions { get; set; }
        public string DishType { get; set; }
        public string Summary { get; set; }
        // Keeping tracking fields
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string UserId { get; set; }
        public List<ExtendedIngredientDto> ExtendedIngredients { get; set; }
    }
}
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using API.Entity;

namespace API.DTOs
{
    public class CreateRecipeDto
    {
        [Required]
        [Length(0, 300)]
        public string Title { get; set; }
        public List<IFormFile> Images { get; set; }
        public string ExistingImageUrls { get; set; }
        public int Servings { get; set; }
        public int PreparationMinutes { get; set; }
        public int CookingMinutes { get; set; }
        [Required]
        public string SourceName { get; set; }
        public string SourceUrl { get; set; }
        public string Cuisine { get; set; }
        public List<string> Diets { get; set; }
        [Required]
        public string Steps { get; set; }
        public string DishType { get; set; }
        public string Summary { get; set; }
        public string UserId { get; set; }
        [Required]
        public string Ingredients { get; set; }
    }
}

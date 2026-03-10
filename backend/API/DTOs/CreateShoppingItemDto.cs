using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class CreateShoppingItemDto
    {
        [Required]
        public long IngredientId { get; set; }
        [Required]
        public string Amount { get; set; }
        [Required]
        public string Unit { get; set; }
    }
}
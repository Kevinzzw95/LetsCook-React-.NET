using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class AddShoppingItemDto
    {
        [Required]
        [Length(0, 300)]
        public string Name { get; set; }
        public string Amount { get; set; }
        public string Unit { get; set; }
        public string Store { get; set; }
        public string UserId { get; set; }
        public bool IsBought { get; set; }
    }
}
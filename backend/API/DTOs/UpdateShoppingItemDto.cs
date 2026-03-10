using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class UpdateShoppingItemDto
    {
        public string Name { get; set; }
        public string Amount { get; set; }
        public string Unit { get; set; }
        public string Store { get; set; }
        public bool IsBought { get; set; }
    }
}
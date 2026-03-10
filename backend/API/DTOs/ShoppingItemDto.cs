using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class ShoppingItemDto
    {
        public long ItemId { get; set; }
        public string Name { get; set; }
        public string Image { get; set; }
        public string Amount { get; set; }
        public string Unit { get; set; }
        public string Store { get; set; }
        public bool IsBought { get; set; }
    }
}
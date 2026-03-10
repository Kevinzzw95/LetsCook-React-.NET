using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class ShoppingListDto
    {
        public string UserId { get; set; }
        public List<ShoppingItemDto> Items { get; set; }
    }
}
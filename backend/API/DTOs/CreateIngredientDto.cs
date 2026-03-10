using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class CreateIngredientDto
    {
        public string Id { get; set; }
        public string Amount { get; set; }
        public string Unit { get; set; }
        public string Name { get; set; }
    }
}
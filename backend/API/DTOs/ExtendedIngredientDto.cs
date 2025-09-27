using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class ExtendedIngredientDto
    {
        public string Consistency { get; set; }
        public string Original { get; set; }
        public double Amount { get; set; }
        public string Unit { get; set; }
        public string Name { get; set; }
        public string Image { get; set; }
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace API.Entity
{
    public class Instruction
    {
        public long Id { set; get; }
        public List<Step> Steps { get; set; } = new();
        public long RecipeId { get; set; }
        public Recipe Recipe { get; set; }
        public string Name { get; set; }
    }
}
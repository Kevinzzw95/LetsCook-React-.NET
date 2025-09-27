using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace API.Entity
{
    [Owned]
    public class Step
    {
        /* public List<Equipment> Equipment { get; set; }
        public List<Ingredient> Ingredients { get; set; } */
        public int StepNumber { get; set; }
        public string Description { get; set; }
        public long InstructionId { get; set; }
        public Instruction Instruction { get; set; }
    }
}
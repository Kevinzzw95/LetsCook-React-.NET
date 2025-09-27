using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace API.DTOs
{
    public class InstructionDto
    {
        public List<StepDto> Steps { get; set; }
        public string Name { get; set; }
    }
}
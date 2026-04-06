using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using API.DTOs;
using API.Entity;
using AutoMapper;

namespace API.RequestHelpers
{
    public class MappingProfiles : Profile
    {
        public MappingProfiles() {
            CreateMap<CreateRecipeDto, Recipe>()
                .ForMember(dest => dest.ImageInfo, opt => opt.Ignore())
                .ForMember(dest => dest.Instructions, opt => opt.Ignore())
                .ForMember(dest => dest.RecipeIngredients, opt => opt.Ignore());
        }
    }
}

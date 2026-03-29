namespace API.DTOs
{
    public class RecipeFacetResponseDto
    {
        public int TotalCount { get; set; }
        public Dictionary<string, int> Type { get; set; } = [];
        public Dictionary<string, int> Cuisine { get; set; } = [];
        public Dictionary<string, int> Diet { get; set; } = [];
    }
}

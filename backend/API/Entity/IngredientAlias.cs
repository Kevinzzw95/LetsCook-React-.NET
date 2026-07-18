namespace API.Entity
{
    public class IngredientAlias
    {
        public long Id { get; set; }
        public long IngredientId { get; set; }
        public Ingredient Ingredient { get; set; }
        public string? Alias { get; set; }
        public string? NormalizedAlias { get; set; }
        public string? LanguageCode { get; set; }
        public string? Source { get; set; }
        public bool IsVerified { get; set; }
    }
}

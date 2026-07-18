using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddCanonicalIngredients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CanonicalNameEn",
                table: "Ingredients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NormalizedCanonicalName",
                table: "Ingredients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UsdaDescription",
                table: "Ingredients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "UsdaFdcId",
                table: "Ingredients",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "IngredientAliases",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    IngredientId = table.Column<long>(type: "bigint", nullable: false),
                    Alias = table.Column<string>(type: "text", nullable: true),
                    NormalizedAlias = table.Column<string>(type: "text", nullable: true),
                    LanguageCode = table.Column<string>(type: "text", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: true),
                    IsVerified = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IngredientAliases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IngredientAliases_Ingredients_IngredientId",
                        column: x => x.IngredientId,
                        principalTable: "Ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Ingredients_NormalizedCanonicalName",
                table: "Ingredients",
                column: "NormalizedCanonicalName");

            migrationBuilder.CreateIndex(
                name: "IX_IngredientAliases_IngredientId",
                table: "IngredientAliases",
                column: "IngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_IngredientAliases_NormalizedAlias",
                table: "IngredientAliases",
                column: "NormalizedAlias",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IngredientAliases");

            migrationBuilder.DropIndex(
                name: "IX_Ingredients_NormalizedCanonicalName",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "CanonicalNameEn",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "NormalizedCanonicalName",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "UsdaDescription",
                table: "Ingredients");

            migrationBuilder.DropColumn(
                name: "UsdaFdcId",
                table: "Ingredients");
        }
    }
}

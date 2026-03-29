using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeRecipeIngredients : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RecipeIngredients",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RecipeId = table.Column<long>(type: "bigint", nullable: false),
                    IngredientId = table.Column<long>(type: "bigint", nullable: false),
                    Amount = table.Column<string>(type: "text", nullable: true),
                    Unit = table.Column<string>(type: "text", nullable: true),
                    Consistency = table.Column<string>(type: "text", nullable: true),
                    Original = table.Column<string>(type: "text", nullable: true),
                    DisplayName = table.Column<string>(type: "text", nullable: true),
                    DisplayImage = table.Column<string>(type: "text", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecipeIngredients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecipeIngredients_Ingredients_IngredientId",
                        column: x => x.IngredientId,
                        principalTable: "Ingredients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RecipeIngredients_Recipes_RecipeId",
                        column: x => x.RecipeId,
                        principalTable: "Recipes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecipeIngredients_IngredientId",
                table: "RecipeIngredients",
                column: "IngredientId");

            migrationBuilder.CreateIndex(
                name: "IX_RecipeIngredients_RecipeId_SortOrder",
                table: "RecipeIngredients",
                columns: new[] { "RecipeId", "SortOrder" });

            migrationBuilder.Sql(
                """
                INSERT INTO "RecipeIngredients" (
                    "RecipeId",
                    "IngredientId",
                    "Amount",
                    "Unit",
                    "Consistency",
                    "Original",
                    "DisplayName",
                    "DisplayImage",
                    "SortOrder"
                )
                SELECT
                    recipe."Id",
                    (ingredient.value ->> 'Id')::bigint,
                    ingredient.value ->> 'Amount',
                    ingredient.value ->> 'Unit',
                    ingredient.value ->> 'Consistency',
                    ingredient.value ->> 'Original',
                    COALESCE(NULLIF(ingredient.value ->> 'Name', ''), catalog."Name"),
                    COALESCE(NULLIF(ingredient.value ->> 'Image', ''), catalog."Image"),
                    ingredient.ordinality - 1
                FROM "Recipes" AS recipe
                CROSS JOIN LATERAL jsonb_array_elements(COALESCE(recipe."ExtendedIngredients", '[]')::jsonb) WITH ORDINALITY AS ingredient(value, ordinality)
                LEFT JOIN "Ingredients" AS catalog
                    ON catalog."Id" = (ingredient.value ->> 'Id')::bigint;
                """);

            migrationBuilder.DropColumn(
                name: "ExtendedIngredients",
                table: "Recipes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExtendedIngredients",
                table: "Recipes",
                type: "text",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "Recipes" AS recipe
                SET "ExtendedIngredients" = COALESCE(recipeIngredients.payload, '[]')
                FROM (
                    SELECT
                        "RecipeId",
                        jsonb_agg(
                            jsonb_build_object(
                                'Id', "IngredientId",
                                'Consistency', "Consistency",
                                'Original', "Original",
                                'Amount', "Amount",
                                'Unit', "Unit",
                                'Name', "DisplayName",
                                'Image', "DisplayImage"
                            )
                            ORDER BY "SortOrder"
                        )::text AS payload
                    FROM "RecipeIngredients"
                    GROUP BY "RecipeId"
                ) AS recipeIngredients
                WHERE recipe."Id" = recipeIngredients."RecipeId";

                UPDATE "Recipes"
                SET "ExtendedIngredients" = '[]'
                WHERE "ExtendedIngredients" IS NULL;
                """);

            migrationBuilder.DropTable(
                name: "RecipeIngredients");
        }
    }
}

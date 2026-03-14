using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AllowMultipleMealPlanEntriesPerSlot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MealPlanEntries_UserId_PlannedDate_MealType",
                table: "MealPlanEntries");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_MealPlanEntries_UserId_PlannedDate_MealType",
                table: "MealPlanEntries",
                columns: new[] { "UserId", "PlannedDate", "MealType" },
                unique: true);
        }
    }
}

CREATE EXTENSION IF NOT EXISTS hstore;

-- CreateTable
CREATE TABLE "AspNetUsers" (
    "Id" TEXT NOT NULL,
    "UserName" VARCHAR(256),
    "NormalizedUserName" VARCHAR(256),
    "Email" VARCHAR(256),
    "NormalizedEmail" VARCHAR(256),
    "EmailConfirmed" BOOLEAN NOT NULL,
    "PasswordHash" TEXT,
    "SecurityStamp" TEXT,
    "ConcurrencyStamp" TEXT,
    "PhoneNumber" TEXT,
    "PhoneNumberConfirmed" BOOLEAN NOT NULL,
    "TwoFactorEnabled" BOOLEAN NOT NULL,
    "LockoutEnd" TIMESTAMPTZ(6),
    "LockoutEnabled" BOOLEAN NOT NULL,
    "AccessFailedCount" INTEGER NOT NULL,
    "RefreshToken" TEXT,
    "RefreshTokenExpiryTime" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AspNetUsers_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "AspNetRoles" (
    "Id" TEXT NOT NULL,
    "Name" VARCHAR(256),
    "NormalizedName" VARCHAR(256),
    "ConcurrencyStamp" TEXT,

    CONSTRAINT "AspNetRoles_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "AspNetUserRoles" (
    "UserId" TEXT NOT NULL,
    "RoleId" TEXT NOT NULL,

    CONSTRAINT "AspNetUserRoles_pkey" PRIMARY KEY ("UserId","RoleId")
);

-- CreateTable
CREATE TABLE "Ingredients" (
    "Id" BIGSERIAL NOT NULL,
    "Name" TEXT,
    "Image" TEXT,
    "CanonicalNameEn" TEXT,
    "NormalizedCanonicalName" TEXT,
    "UsdaDescription" TEXT,
    "UsdaFdcId" BIGINT,

    CONSTRAINT "Ingredients_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "IngredientAliases" (
    "Id" BIGSERIAL NOT NULL,
    "IngredientId" BIGINT NOT NULL,
    "Alias" TEXT,
    "NormalizedAlias" TEXT,
    "LanguageCode" TEXT,
    "Source" TEXT,
    "IsVerified" BOOLEAN NOT NULL,

    CONSTRAINT "IngredientAliases_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Recipes" (
    "Id" BIGSERIAL NOT NULL,
    "Title" TEXT,
    "ImageInfo" hstore NOT NULL,
    "Servings" INTEGER NOT NULL,
    "PreparationMinutes" INTEGER NOT NULL,
    "CookingMinutes" INTEGER NOT NULL,
    "SourceName" TEXT,
    "SourceUrl" TEXT,
    "Cuisine" TEXT,
    "Diets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "DishType" TEXT,
    "Summary" TEXT,
    "Calories" DECIMAL NOT NULL,
    "Protein" DECIMAL NOT NULL,
    "Carbohydrate" DECIMAL NOT NULL,
    "Fat" DECIMAL NOT NULL,
    "CreatedAt" TIMESTAMPTZ(6) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ(6) NOT NULL,
    "UserId" TEXT,

    CONSTRAINT "Recipes_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Instruction" (
    "Id" BIGSERIAL NOT NULL,
    "RecipeId" BIGINT NOT NULL,
    "Name" TEXT,

    CONSTRAINT "Instruction_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "Step" (
    "InstructionId" BIGINT NOT NULL,
    "Id" SERIAL NOT NULL,
    "StepNumber" INTEGER NOT NULL,
    "Description" TEXT,

    CONSTRAINT "Step_pkey" PRIMARY KEY ("InstructionId","Id")
);

-- CreateTable
CREATE TABLE "RecipeIngredients" (
    "Id" BIGSERIAL NOT NULL,
    "RecipeId" BIGINT NOT NULL,
    "IngredientId" BIGINT NOT NULL,
    "Amount" TEXT,
    "Unit" TEXT,
    "Consistency" TEXT,
    "Original" TEXT,
    "DisplayName" TEXT,
    "DisplayImage" TEXT,
    "SortOrder" INTEGER NOT NULL,

    CONSTRAINT "RecipeIngredients_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ShoppingLists" (
    "Id" SERIAL NOT NULL,
    "UserId" TEXT,
    "ClientSecret" TEXT,

    CONSTRAINT "ShoppingLists_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "ShoppingItems" (
    "Id" BIGSERIAL NOT NULL,
    "IngredientId" BIGINT,
    "Amount" TEXT,
    "Unit" TEXT,
    "Store" TEXT,
    "IsBought" BOOLEAN NOT NULL,
    "ShoppingListId" INTEGER NOT NULL,

    CONSTRAINT "ShoppingItems_pkey" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "MealPlanEntries" (
    "Id" BIGSERIAL NOT NULL,
    "UserId" TEXT,
    "PlannedDate" TIMESTAMPTZ(6) NOT NULL,
    "MealType" TEXT,
    "RecipeId" BIGINT NOT NULL,
    "CreatedAt" TIMESTAMPTZ(6) NOT NULL,
    "UpdatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MealPlanEntries_pkey" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE INDEX "AspNetUserRoles_RoleId_idx" ON "AspNetUserRoles"("RoleId");

-- CreateIndex
CREATE INDEX "IngredientAliases_IngredientId_idx" ON "IngredientAliases"("IngredientId");

-- CreateIndex
CREATE INDEX "IngredientAliases_NormalizedAlias_idx" ON "IngredientAliases"("NormalizedAlias");

-- CreateIndex
CREATE INDEX "Instruction_RecipeId_idx" ON "Instruction"("RecipeId");

-- CreateIndex
CREATE INDEX "RecipeIngredients_IngredientId_idx" ON "RecipeIngredients"("IngredientId");

-- CreateIndex
CREATE INDEX "RecipeIngredients_RecipeId_SortOrder_idx" ON "RecipeIngredients"("RecipeId", "SortOrder");

-- CreateIndex
CREATE INDEX "ShoppingItems_IngredientId_idx" ON "ShoppingItems"("IngredientId");

-- CreateIndex
CREATE INDEX "ShoppingItems_ShoppingListId_idx" ON "ShoppingItems"("ShoppingListId");

-- CreateIndex
CREATE INDEX "MealPlanEntries_RecipeId_idx" ON "MealPlanEntries"("RecipeId");

-- CreateIndex
CREATE INDEX "MealPlanEntries_UserId_PlannedDate_MealType_idx" ON "MealPlanEntries"("UserId", "PlannedDate", "MealType");

-- AddForeignKey
ALTER TABLE "AspNetUserRoles" ADD CONSTRAINT "AspNetUserRoles_UserId_fkey" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AspNetUserRoles" ADD CONSTRAINT "AspNetUserRoles_RoleId_fkey" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientAliases" ADD CONSTRAINT "IngredientAliases_IngredientId_fkey" FOREIGN KEY ("IngredientId") REFERENCES "Ingredients"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instruction" ADD CONSTRAINT "Instruction_RecipeId_fkey" FOREIGN KEY ("RecipeId") REFERENCES "Recipes"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_InstructionId_fkey" FOREIGN KEY ("InstructionId") REFERENCES "Instruction"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredients" ADD CONSTRAINT "RecipeIngredients_RecipeId_fkey" FOREIGN KEY ("RecipeId") REFERENCES "Recipes"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredients" ADD CONSTRAINT "RecipeIngredients_IngredientId_fkey" FOREIGN KEY ("IngredientId") REFERENCES "Ingredients"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItems" ADD CONSTRAINT "ShoppingItems_IngredientId_fkey" FOREIGN KEY ("IngredientId") REFERENCES "Ingredients"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingItems" ADD CONSTRAINT "ShoppingItems_ShoppingListId_fkey" FOREIGN KEY ("ShoppingListId") REFERENCES "ShoppingLists"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanEntries" ADD CONSTRAINT "MealPlanEntries_RecipeId_fkey" FOREIGN KEY ("RecipeId") REFERENCES "Recipes"("Id") ON DELETE CASCADE ON UPDATE CASCADE;


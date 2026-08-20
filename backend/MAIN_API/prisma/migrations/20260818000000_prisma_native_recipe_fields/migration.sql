BEGIN;

ALTER TABLE "Recipes"
  ALTER COLUMN "ImageInfo" TYPE jsonb
    USING COALESCE(hstore_to_json("ImageInfo")::jsonb, '{}'::jsonb),
  ALTER COLUMN "ImageInfo" SET DEFAULT '{}'::jsonb,
  ALTER COLUMN "ImageInfo" SET NOT NULL;

UPDATE "Recipes"
SET "Diets" = ARRAY[]::text[]
WHERE "Diets" IS NULL;

ALTER TABLE "Recipes"
  ALTER COLUMN "Diets" SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN "Diets" SET NOT NULL;

COMMIT;

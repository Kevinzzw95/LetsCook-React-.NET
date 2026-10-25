const { PrismaClient } = require('@prisma/client');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const prisma = new PrismaClient();
const baseline = '20260817000000_initial_schema';
const nativeFields = '20260818000000_prisma_native_recipe_fields';
const baselineSql = readFileSync(path.join(__dirname, '../prisma/migrations', baseline, 'migration.sql'), 'utf8');
const runPrisma = (...args) => execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], { stdio: 'inherit' });
async function sqlBatch(db, sql) {
  // These checked-in SQL files contain plain DDL only (no procedural bodies).
  for (const statement of sql.split(';').filter(s => s.replace(/--[^\n]*/g, '').trim())) {
    await db.$executeRawUnsafe(statement);
  }
}
async function columns(db, schema) {
  return db.$queryRaw`SELECT table_name, column_name, data_type, udt_name, is_nullable,
    character_maximum_length, numeric_precision, numeric_scale, datetime_precision, column_default
    FROM information_schema.columns WHERE table_schema = ${schema} ORDER BY table_name, ordinal_position`;
}
async function validateRestoredSchema(currentImageType) {
  await prisma.$transaction(async db => {
    await db.$executeRawUnsafe('CREATE SCHEMA letscook_baseline_check');
    await db.$executeRawUnsafe('SET LOCAL search_path TO letscook_baseline_check, public');
    let expectedSql = baselineSql.replace('CREATE EXTENSION IF NOT EXISTS hstore;', '');
    if (currentImageType === 'jsonb') expectedSql = expectedSql.replace(`"ImageInfo" hstore NOT NULL`, `"ImageInfo" JSONB NOT NULL DEFAULT '{}'`).replace(`"Diets" TEXT[] DEFAULT`, `"Diets" TEXT[] NOT NULL DEFAULT`);
    await sqlBatch(db, expectedSql);
    const expected = await columns(db, 'letscook_baseline_check');
    const actual = await columns(db, 'public');
    const canonical = column => JSON.stringify(currentImageType === 'hstore' && column.table_name === 'Recipes' && column.column_name === 'ImageInfo' ? { ...column, column_default: null } : column).replaceAll('letscook_baseline_check.', '').replaceAll('public.', '');
    const mismatches = expected.filter(column => !actual.some(a => canonical(a) === canonical(column)));
    // Check keys/references structurally, allowing historical constraint names.
    const constraints = await db.$queryRaw`SELECT n.nspname AS schema, c.relname AS table_name,
      pg_get_constraintdef(k.oid) AS definition
      FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname IN ('public','letscook_baseline_check') AND k.contype IN ('p','u','f')`;
    const normalize = text => text.replaceAll('letscook_baseline_check.', '').replaceAll('public.', '');
    const missingKeys = constraints.filter(k => k.schema === 'letscook_baseline_check' && !constraints.some(a =>
      a.schema === 'public' && a.table_name === k.table_name && normalize(a.definition) === normalize(k.definition)));
    if (mismatches.length || missingKeys.length) {
      throw new Error('Restored schema differs from baseline. Reconcile before baselining: ' +
        JSON.stringify({ columns: mismatches.map(c => `${c.table_name}.${c.column_name}`), constraints: missingKeys }));
    }
    await db.$executeRawUnsafe('DROP SCHEMA letscook_baseline_check CASCADE');
  }, { timeout: 60000 });
}
async function main() {
  const dimensions = Number(process.env.OPENAI_EMBEDDING_DIMENSIONS || 1536);
  if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 16000) throw new Error('Invalid embedding dimensions');
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='_prisma_migrations'`;
  let applied = [];
  if (tables.length) applied = await prisma.$queryRawUnsafe('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
  const hasBaseline = applied.some(row => row.migration_name === baseline);
  const recipes = await prisma.$queryRaw`SELECT udt_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Recipes' AND column_name='ImageInfo'`;
  if (!hasBaseline && recipes.length) {
    if (process.env.BASELINE_RESTORED !== 'true') throw new Error('Restored database detected. Back it up and set BASELINE_RESTORED=true after reviewing docs/DOCKER.md.');
    await validateRestoredSchema(recipes[0].udt_name);
    runPrisma('migrate', 'resolve', '--applied', baseline);
    if (recipes[0].udt_name === 'jsonb' && !applied.some(row => row.migration_name === nativeFields)) {
      // Validation above proves the final native column shape. Verify data/defaults as well.
      const invalid = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Recipes" WHERE "Diets" IS NULL OR "ImageInfo" IS NULL');
      if (invalid[0].count) throw new Error('Restored Recipes contains null native fields; reconcile before continuing');
      runPrisma('migrate', 'resolve', '--applied', nativeFields);
    }
  }
  // The historical conversion cannot cast an hstore-typed default to JSONB.
  if (recipes[0]?.udt_name === 'hstore') {
    await prisma.$executeRawUnsafe('ALTER TABLE "Recipes" ALTER COLUMN "ImageInfo" DROP DEFAULT');
  }
  runPrisma('migrate', 'deploy');
  await prisma.$transaction(async db => {
    // Registration uses the historical default role ID. Preserve imported roles.
    await db.role.upsert({ where: { Id: '1' }, update: {}, create: {
      Id: '1', Name: 'User', NormalizedName: 'USER', ConcurrencyStamp: randomUUID(),
    } });
    await db.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('letscook-ai-schema'))");
    await sqlBatch(db, readFileSync(path.join(__dirname, 'ai-schema.sql'), 'utf8').replace('__DIMENSIONS__', String(dimensions)));
    const type = await db.$queryRaw`SELECT format_type(a.atttypid,a.atttypmod) AS type FROM pg_attribute a
      WHERE a.attrelid='langchain_pg_embedding'::regclass AND a.attname='embedding'`;
    if (type[0]?.type !== `vector(${dimensions})`) throw new Error('Existing embedding dimensions differ; migrate/re-embed explicitly');
    await db.$executeRaw`INSERT INTO langchain_pg_collection(uuid,name) VALUES
      (${randomUUID()}::uuid, ${process.env.RECIPE_VECTOR_COLLECTION || 'letscook_recipes'}) ON CONFLICT (name) DO NOTHING`;
  }, { timeout: 60000 });
  console.log('Database initialization complete');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());

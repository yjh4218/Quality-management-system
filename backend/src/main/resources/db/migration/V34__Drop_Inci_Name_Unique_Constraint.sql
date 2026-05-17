-- V34: Drop unique constraint/index on inci_name in regulatory_ingredients to support full sync without deduplication.

-- Drop constraint in PostgreSQL (default name)
ALTER TABLE regulatory_ingredients DROP CONSTRAINT IF EXISTS regulatory_ingredients_inci_name_key;

-- Drop constraints in H2/PostgreSQL (Hibernate auto-generated names)
ALTER TABLE regulatory_ingredients DROP CONSTRAINT IF EXISTS uk_380bierkp83sbnh6w1e3j74nt;
ALTER TABLE regulatory_ingredients DROP CONSTRAINT IF EXISTS uk380bierkp83sbnh6w1e3j74nt;
ALTER TABLE regulatory_ingredients DROP CONSTRAINT IF EXISTS "UK_380BIERKP83SBNH6W1E3J74NT";

-- Drop unique indexes in H2/PostgreSQL if they exist as indexes rather than constraints
DROP INDEX IF EXISTS uk_380bierkp83sbnh6w1e3j74nt;
DROP INDEX IF EXISTS uk380bierkp83sbnh6w1e3j74nt;
DROP INDEX IF EXISTS "UK_380BIERKP83SBNH6W1E3J74NT";
DROP INDEX IF EXISTS "UK_380BIERKP83SBNH6W1E3J74NT_INDEX_C";

import fs from 'fs';
import { pool } from './db.js';

// Every table holding personal data. Each row belongs to one profile (user).
export const OWNED_TABLES = [
  'active_plugins',
  'salah_logs', 'quran_sessions', 'quran_memorization',
  'media_items',
  'books', 'book_sessions',
  'habits', 'habit_logs',
  'routine_blocks', 'routine_logs', 'one_off_tasks',
  'period_logs', 'period_cycles', 'period_settings',
  'nutrition_goals', 'food_items', 'meals', 'meal_entries', 'water_logs',
  'notes', 'tags',
  'workout_templates', 'workout_sessions', 'workout_exercises',
];

// Uniqueness that used to be global and is now per profile:
// [table, old constraint name, new unique columns]
const PER_USER_UNIQUES = [
  ['active_plugins', 'active_plugins_plugin_id_key', ['plugin_id']],
  ['salah_logs', 'salah_logs_date_key', ['date']],
  ['quran_memorization', 'quran_memorization_surah_number_ayah_number_key', ['surah_number', 'ayah_number']],
  ['period_logs', 'period_logs_log_date_key', ['log_date']],
  ['tags', 'tags_name_key', ['name']],
];

async function tableExists(name) {
  const result = await pool.query('SELECT to_regclass($1) AS oid', [`public.${name}`]);
  return result.rows[0].oid !== null;
}

// Fresh database: create the original (v1) schema from schema.sql
async function createBaseSchema() {
  if (await tableExists('users')) return;
  const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  console.log('Created base schema from schema.sql');
}

// Columns and tables added after v1 (movie details, period tracker, meal tracker)
async function addFeatureTables() {
  // 1. Add movie/series columns
  await pool.query(`
    ALTER TABLE media_items 
    ADD COLUMN IF NOT EXISTS imdb_rating VARCHAR(50),
    ADD COLUMN IF NOT EXISTS duration VARCHAR(100),
    ADD COLUMN IF NOT EXISTS director VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "cast" TEXT,
    ADD COLUMN IF NOT EXISTS imdb_id VARCHAR(100);
  `);

  // 2. Create period tracker tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS period_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      log_date DATE NOT NULL UNIQUE,
      is_period_day BOOLEAN DEFAULT FALSE,
      is_period_start BOOLEAN DEFAULT FALSE,
      is_period_end BOOLEAN DEFAULT FALSE,
      flow_intensity VARCHAR(20),
      moods TEXT[],
      symptoms TEXT[],
      energy_level INTEGER,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure newly-added columns exist even if the table was created earlier
  await pool.query(`
    ALTER TABLE period_logs
      ADD COLUMN IF NOT EXISTS is_period_start BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_period_end   BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS flow_intensity  VARCHAR(20),
      ADD COLUMN IF NOT EXISTS moods           TEXT[],
      ADD COLUMN IF NOT EXISTS symptoms        TEXT[],
      ADD COLUMN IF NOT EXISTS energy_level    INTEGER,
      ADD COLUMN IF NOT EXISTS notes           TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS period_cycles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      start_date DATE NOT NULL,
      end_date DATE,
      cycle_length INTEGER,
      period_duration INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS period_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      average_cycle_length INTEGER DEFAULT 28,
      average_period_duration INTEGER DEFAULT 5,
      reminder_time VARCHAR(10) DEFAULT '09:00',
      show_fertile_window BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);


  // 3. Meal Tracker tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nutrition_goals (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      calories INTEGER DEFAULT 2000,
      protein_g DECIMAL(6,1) DEFAULT 150,
      carbs_g DECIMAL(6,1) DEFAULT 250,
      fat_g DECIMAL(6,1) DEFAULT 65,
      fiber_g DECIMAL(6,1) DEFAULT 30,
      water_ml INTEGER DEFAULT 2000,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS food_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(255),
      source VARCHAR(50) DEFAULT 'custom',
      source_id VARCHAR(100),
      calories_per_100g DECIMAL(8,2),
      protein_per_100g DECIMAL(8,2),
      carbs_per_100g DECIMAL(8,2),
      fat_per_100g DECIMAL(8,2),
      fiber_per_100g DECIMAL(8,2),
      sugar_per_100g DECIMAL(8,2),
      sodium_per_100g DECIMAL(8,2),
      is_custom BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS meals (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      meal_date DATE NOT NULL,
      meal_type VARCHAR(20) NOT NULL DEFAULT 'snack',
      name VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS meal_entries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
      food_item_id UUID REFERENCES food_items(id) ON DELETE SET NULL,
      food_name VARCHAR(255) NOT NULL,
      quantity_g DECIMAL(8,2) NOT NULL DEFAULT 100,
      calories DECIMAL(8,2),
      protein_g DECIMAL(8,2),
      carbs_g DECIMAL(8,2),
      fat_g DECIMAL(8,2),
      fiber_g DECIMAL(8,2),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS water_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      log_date DATE NOT NULL,
      amount_ml INTEGER NOT NULL DEFAULT 250,
      logged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Profiles: name/avatar/color on users, and a user_id owner on every personal table
async function addProfiles() {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS name   VARCHAR(100),
      ADD COLUMN IF NOT EXISTS avatar VARCHAR(20),
      ADD COLUMN IF NOT EXISTS color  VARCHAR(20);
  `);
  await pool.query(`UPDATE users SET name = 'Me' WHERE name IS NULL`);

  // Data from before profiles existed belongs to the first profile
  const firstUser = await pool.query('SELECT id FROM users ORDER BY created_at LIMIT 1');
  const firstUserId = firstUser.rows[0]?.id ?? null;

  for (const table of OWNED_TABLES) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE`);
    if (firstUserId) {
      await pool.query(`UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`, [firstUserId]);
    } else {
      // No profile yet: only ownerless default rows (old global settings seeds) can be here
      await pool.query(`DELETE FROM ${table} WHERE user_id IS NULL`);
    }
    await pool.query(`ALTER TABLE ${table} ALTER COLUMN user_id SET NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS ${table}_user_id_idx ON ${table} (user_id)`);
  }

  for (const [table, oldConstraint, columns] of PER_USER_UNIQUES) {
    await pool.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${oldConstraint}`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_user_unique ON ${table} (user_id, ${columns.join(', ')})`);
  }
}

// Notes & Journal: entries can be shared with the other profiles
async function addNotesSharing() {
  await pool.query('ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query('CREATE INDEX IF NOT EXISTS notes_type_date_idx ON notes (type, date DESC, created_at DESC)');
}

// Workout Logger: richer sessions, cardio fields, and exercises saved on templates
async function addWorkoutDetails() {
  await pool.query(`
    ALTER TABLE workout_sessions
      ADD COLUMN IF NOT EXISTS title   VARCHAR(255),
      ADD COLUMN IF NOT EXISTS type    VARCHAR(50),
      ADD COLUMN IF NOT EXISTS feeling INT CHECK (feeling BETWEEN 1 AND 5);
  `);
  await pool.query(`
    ALTER TABLE workout_exercises
      ADD COLUMN IF NOT EXISTS duration_minutes INT,
      ADD COLUMN IF NOT EXISTS distance_km      DECIMAL(7,2),
      ADD COLUMN IF NOT EXISTS position         INT NOT NULL DEFAULT 0;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workout_template_exercises (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      sets INT,
      reps INT,
      weight DECIMAL(10,2),
      duration_minutes INT,
      distance_km DECIMAL(7,2),
      position INT NOT NULL DEFAULT 0
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS workout_sessions_user_date_idx ON workout_sessions (user_id, date DESC)');
}

// Password vault: only ciphertext and key-derivation parameters are stored
async function addVault() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vault_keys (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      salt TEXT NOT NULL,
      iterations INT NOT NULL,
      wrapped_key TEXT NOT NULL,
      wrap_iv TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vault_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS vault_items_user_id_idx ON vault_items (user_id)');
}

export async function migrate() {
  await createBaseSchema();
  await addFeatureTables();
  await addProfiles();
  await addNotesSharing();
  await addWorkoutDetails();
  await addVault();
  console.log('Database migrations completed successfully.');
}

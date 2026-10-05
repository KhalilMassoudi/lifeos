import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, types } = pg;

// Return DATE columns as plain 'YYYY-MM-DD' strings. By default pg turns them
// into JS Dates at local midnight, and toISOString() then shifts them to the
// previous day in any timezone east of UTC.
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value) => value);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'lifeos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Run automatic migrations for OMDB columns and Period Tracker tables
async function runMigrations() {
  try {
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

    // Seed default settings row if empty
    await pool.query(`
      INSERT INTO period_settings (average_cycle_length, average_period_duration, reminder_time, show_fertile_window)
      SELECT 28, 5, '09:00', TRUE
      WHERE NOT EXISTS (SELECT 1 FROM period_settings);
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
      INSERT INTO nutrition_goals (calories, protein_g, carbs_g, fat_g, fiber_g, water_ml)
      SELECT 2000, 150, 250, 65, 30, 2000
      WHERE NOT EXISTS (SELECT 1 FROM nutrition_goals);
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

    console.log('Database migrations completed successfully.');
  } catch (error) {
    console.error('Database migration failed:', error);
  }
}
runMigrations();

export const query = (text, params) => pool.query(text, params);

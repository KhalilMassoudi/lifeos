-- LifeOS PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- CORE
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE active_plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PHASE 1: SALAH & QURAN
-- =========================================================

CREATE TABLE salah_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    fajr_status VARCHAR(20),
    fajr_note TEXT,
    dhuhr_status VARCHAR(20),
    dhuhr_note TEXT,
    asr_status VARCHAR(20),
    asr_note TEXT,
    maghrib_status VARCHAR(20),
    maghrib_note TEXT,
    isha_status VARCHAR(20),
    isha_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quran_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    surah_number INT NOT NULL,
    from_ayah INT NOT NULL,
    to_ayah INT NOT NULL,
    duration INT NOT NULL, -- in minutes
    session_type VARCHAR(50) NOT NULL, -- tilawah/hifz/muraja
    difficulty INT CHECK (difficulty >= 1 AND difficulty <= 5),
    notes TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quran_memorization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    surah_number INT NOT NULL,
    ayah_number INT NOT NULL,
    status VARCHAR(50) NOT NULL, -- memorized/inprogress
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (surah_number, ayah_number)
);

-- =========================================================
-- PHASE 2: MOVIES, SERIES & ANIME
-- =========================================================

CREATE TABLE media_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    tmdb_id VARCHAR(100),
    poster_url TEXT,
    description TEXT,
    release_year INT,
    genres TEXT[],
    rating INT CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(50) NOT NULL, -- want_to_watch/watching/completed/dropped
    notes TEXT,
    type VARCHAR(50) NOT NULL, -- movie/series/anime
    current_season INT DEFAULT 1,
    current_episode INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PHASE 3: BOOKS
-- =========================================================

CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    openlibrary_id VARCHAR(100),
    cover_url TEXT,
    genres TEXT[],
    total_pages INT,
    pages_read INT DEFAULT 0,
    status VARCHAR(50) NOT NULL, -- want_to_read/reading/finished/abandoned
    rating INT CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    start_date DATE,
    finish_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE book_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    pages_read INT NOT NULL,
    duration_minutes INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PHASE 4: HABITS
-- =========================================================

CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    emoji VARCHAR(10),
    frequency_type VARCHAR(50) NOT NULL, -- daily/specific_days
    frequency_days TEXT[], -- e.g., ['Mon', 'Wed', 'Fri']
    color VARCHAR(50),
    goal_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(habit_id, date)
);

-- =========================================================
-- PHASE 5: ROUTINE & SCHEDULE
-- =========================================================

CREATE TABLE routine_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time TIME NOT NULL,
    title VARCHAR(255) NOT NULL,
    duration_minutes INT NOT NULL,
    label VARCHAR(100),
    emoji VARCHAR(10),
    color_category VARCHAR(50), -- morning/work/personal/evening/night
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routine_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES routine_blocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(block_id, date)
);

CREATE TABLE one_off_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(50) NOT NULL, -- high/medium/low
    due_time TIME,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PHASE 6: JOURNAL & NOTES
-- =========================================================

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255),
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- quick_note/journal
    mood VARCHAR(50), -- emoji/string
    color_tag VARCHAR(50),
    is_pinned BOOLEAN DEFAULT FALSE,
    date DATE, -- used specifically for journal entries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(50)
);

CREATE TABLE note_tags (
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- =========================================================
-- PHASE 7: SAVED LINKS & MEDIA
-- =========================================================

CREATE TABLE saved_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    title VARCHAR(255),
    type VARCHAR(50), -- article/video/tool/image/other
    thumbnail_url TEXT,
    notes TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE link_tags (
    link_id UUID REFERENCES saved_links(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (link_id, tag_id)
);

-- =========================================================
-- PHASE 8: WORKOUT LOGGER
-- =========================================================

CREATE TABLE workout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- strength/cardio/flexibility/sport/other
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    duration_minutes INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sets INT NOT NULL DEFAULT 1,
    reps INT,
    weight DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for 'updated_at' columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_active_plugins_updated_at BEFORE UPDATE ON active_plugins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salah_logs_updated_at BEFORE UPDATE ON salah_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quran_memorization_updated_at BEFORE UPDATE ON quran_memorization FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_items_updated_at BEFORE UPDATE ON media_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routine_blocks_updated_at BEFORE UPDATE ON routine_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_one_off_tasks_updated_at BEFORE UPDATE ON one_off_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_links_updated_at BEFORE UPDATE ON saved_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_templates_updated_at BEFORE UPDATE ON workout_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_sessions_updated_at BEFORE UPDATE ON workout_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- PRIVATE & PERSONAL PERIOD & CYCLE TRACKER
-- =========================================================

CREATE TABLE period_logs (
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

CREATE TABLE period_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_date DATE NOT NULL,
  end_date DATE,
  cycle_length INTEGER,
  period_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE period_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  average_cycle_length INTEGER DEFAULT 28,
  average_period_duration INTEGER DEFAULT 5,
  reminder_time VARCHAR(10) DEFAULT '09:00',
  show_fertile_window BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_period_logs_updated_at BEFORE UPDATE ON period_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_period_cycles_updated_at BEFORE UPDATE ON period_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

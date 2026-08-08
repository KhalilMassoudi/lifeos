import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';
import authRoutes from './routes/auth.js';
import pluginsRoutes from './routes/plugins.js';
import salahRoutes from './routes/salah.js';
import quranRoutes from './routes/quran.js';
import mediaRoutes from './routes/media.js';
import booksRoutes from './routes/books.js';
import habitsRoutes from './routes/habits.js';
import routineRoutes from './routes/routine.js';
import periodRoutes from './routes/period.js';
import mealsRoutes from './routes/meals.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plugins', pluginsRoutes);
app.use('/api/salah', salahRoutes);
app.use('/api/quran', quranRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/movies', mediaRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/routine', routineRoutes);
app.use('/api/period', periodRoutes);
app.use('/api/meals', mealsRoutes);

// Basic health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test DB connection
    await query('SELECT 1');
    res.status(200).json({ status: 'ok', message: 'LifeOS backend is running and connected to DB.' });
  } catch (error) {
    console.error('DB Connection error:', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

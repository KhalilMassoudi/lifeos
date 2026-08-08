# LifeOS Backend (Phase 1)

This is the Express.js API backend for LifeOS, using PostgreSQL for persistence.

## Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally on port 5432)

## 1. Database Setup

1. Open your PostgreSQL terminal (e.g., `psql -U postgres`).
2. Create the database:
   ```sql
   CREATE DATABASE lifeos;
   ```
3. Connect to the database:
   ```sql
   \c lifeos
   ```
4. Run the schema file to create all tables:
   ```sql
   \i 'C:/Users/HP/OneDrive/Bureau/lifeos/server/schema.sql'
   ```
*(Alternatively, you can use pgAdmin to run the contents of `schema.sql` against the `lifeos` database).*

## 2. Environment Variables

Create a `.env` file in this `server` directory. Use the provided `.env.example` as a template:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lifeos
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=super_secret_lifeos_key
```

Make sure to replace `your_password` with your actual local PostgreSQL password.

## 3. Install Dependencies & Run

1. Open a terminal in the `server` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   npm run dev
   ```

The backend API will run on `http://localhost:3000`. 
The frontend Vite server should remain running on port `5173`.

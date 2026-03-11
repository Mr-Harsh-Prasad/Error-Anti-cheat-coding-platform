# Error 1.0 – The Initial Crash (Coding Contest Platform)

A full-stack modern web application built for the GFG Cloud Computing Club programming contest.
The platform features a countdown timer locking mechanism, dark theme UI, Judge0 API integration for real-time code execution, Neon Postgres DB, and anti-cheat logging.

## Tech Stack
- **Frontend:** HTML, CSS (Variables + Glassmorphism), Vanilla JS (Vite built)
- **Editor:** Monaco Editor API
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (Neon Serverless)
- **Execution:** Judge0 API (RapidAPI)

---

## Local Development Setup

### 1. Database Setup
1. Create a free account on [Neon DB](https://neon.tech/).
2. Grab the `postgres://` connection string.
3. In `backend/`, copy `.env.example` to `.env` and fill in `DATABASE_URL`.
4. Connect to your database using pgAdmin or the Neon SQL Editor and copy/paste all contents of `backend/schema.sql` to initialize your tables.
5. *(Optional)* Insert mock problems into the `Problems` table to see them in the UI.

### 2. Backend Initialization
```bash
cd backend
npm install
npm start
```
*Note: Make sure your `.env` contains the Judge0 API key to allow actual execution, otherwise it uses a built-in mock for testing.*

### 3. Frontend Initialization
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173/`.
Open it in your browser. The frontend assumes the backend is on `http://localhost:3000/`.

---

## Deployment (Vercel)

1. Connect your GitHub repository to Vercel.
2. In the Vercel dashboard:
   - Create one project for **Frontend**. Set root directory to `frontend`, Framework preset to "Vite".
   - Create a second project for **Backend**. Set root directory to `backend`, Framework preset to "Other". Set the "Build Command" to empty and install `vercel.json` if necessary to deploy Express as Serverless Functions. Or deploy the backend to Render / Railway which is natively supported for standard Express loop servers.
3. Don't forget to put `DATABASE_URL` and `JUDGE0_API_KEY` into the deployment Environment Variables.
4. Update the `API_BASE` in the frontend `.js` files to point to your new Production Backend URL.

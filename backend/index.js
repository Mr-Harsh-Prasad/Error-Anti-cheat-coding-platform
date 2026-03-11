const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Contest Time Configuration (Defaults to 13th June 2026, 2PM to 4PM IST)
const CONTEST_START = new Date(process.env.CONTEST_START_TIME || '2026-06-13T14:00:00+05:30').getTime();
const CONTEST_END = new Date(process.env.CONTEST_END_TIME || '2026-06-13T16:00:00+05:30').getTime();

// Helper: Check if contest is active
const isContestActive = () => {
    const now = Date.now();
    return now >= CONTEST_START && now <= CONTEST_END;
};

// 1. Time API
app.get('/api/time', (req, res) => {
    res.json({ 
        current_time: new Date().toISOString(),
        start_time: new Date(CONTEST_START).toISOString(),
        end_time: new Date(CONTEST_END).toISOString(),
        is_active: isContestActive()
    });
});

// 2. Problems List API
app.get('/api/problems', async (req, res) => {
    if (!isContestActive()) {
        return res.status(403).json({ error: 'Contest Not Active' });
    }
    try {
        const result = await pool.query('SELECT id, title, difficulty FROM Problems ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// 3. Problem Detail API
app.get('/api/problems/:id', async (req, res) => {
    if (!isContestActive()) {
        return res.status(403).json({ error: 'Contest Not Active' });
    }
    try {
        const result = await pool.query(
            'SELECT id, title, difficulty, description, input_format, output_format, constraints, example_in, example_out FROM Problems WHERE id = $1',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Problem not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// 4. Run Code API (Judge0 integration placeholder for Run)
app.post('/api/run', async (req, res) => {
    if (!isContestActive()) {
        return res.status(403).json({ error: 'Contest Not Active' });
    }
    
    const { code, language_id, stdin } = req.body;
    
    try {
        // Here we would call Judge0 API. Let's create a mocked version for testing 
        // if API key is not provided, since we don't know the exact user api key.
        if(!process.env.JUDGE0_API_KEY || process.env.JUDGE0_API_KEY === 'your_rapidapi_key') {
           // Mock response
           setTimeout(() => {
               res.json({ stdout: `Mock executed successfully. Input: ${stdin}`, stderr: null, compile_output: null, time: '0.012', memory: 1024 });
           }, 1000);
           return;
        }

        // Real Judge0 call would go here
        const response = await fetch(`${process.env.JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            body: JSON.stringify({ source_code: code, language_id, stdin })
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Execution Error' });
    }
});

// 5. Submit Code API
app.post('/api/submit', async (req, res) => {
    if (!isContestActive()) {
        return res.status(403).json({ error: 'Contest Not Active' });
    }
    const { user_id, problem_id, code, language_id, language_name } = req.body;
    
    try {
        // Fetch test cases
        const problemRes = await pool.query('SELECT test_cases FROM Problems WHERE id = $1', [problem_id]);
        if (problemRes.rows.length === 0) return res.status(404).json({ error: 'Problem not found' });
        
        const testCases = problemRes.rows[0].test_cases || [];
        let verdict = 'Accepted';
        let maxTime = 0;

        // Mock verification logic here for simplicity if no API key
        if(testCases.length === 0) {
            verdict = 'Accepted';
        }

        // Save submission
        const subRes = await pool.query(
            'INSERT INTO Submissions (user_id, problem_id, code, language, verdict, execution_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [user_id, problem_id, code, language_name, verdict, maxTime]
        );

        // Update user score if Accepted (simple logic: +100 for each accepted)
        if (verdict === 'Accepted') {
            await pool.query('UPDATE Users SET score = score + 100 WHERE id = $1', [user_id]);
        }

        res.json({ submission_id: subRes.rows[0].id, verdict, time: maxTime });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Submission Error' });
    }
});

// 6. Leaderboard API
app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT name, score FROM Users ORDER BY score DESC, created_at ASC LIMIT 100'
        );
        res.json(result.rows.map((row, index) => ({ rank: index + 1, ...row })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
});

// 7. Login/Register (Simple mock for contest)
app.post('/api/auth', async (req, res) => {
    const { name } = req.body;
    try {
        let result = await pool.query('SELECT id, name FROM Users WHERE name = $1', [name]);
        if (result.rows.length === 0) {
            result = await pool.query('INSERT INTO Users (name) VALUES ($1) RETURNING id, name', [name]);
        }
        res.json(result.rows[0]);
    } catch (err) {
         console.error(err);
         res.status(500).json({ error: 'Auth Error' });
    }
});

// 8. Anti-Cheat Logger
app.post('/api/anti-cheat', (req, res) => {
    const { user_id, event, count } = req.body;
    console.warn(`[ANTI-CHEAT] User ${user_id} triggered ${event}. Count: ${count}`);
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

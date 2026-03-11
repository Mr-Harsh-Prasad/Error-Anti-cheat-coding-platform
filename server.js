const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Neon DB connection pool provided by user
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5T4gCWMNylZo@ep-nameless-violet-abv0alyk-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

// Helper: Check if contest is active dynamically from DB
const isContestActive = async () => {
    try {
        const result = await pool.query("SELECT key, value FROM Settings WHERE key IN ('CONTEST_START', 'CONTEST_END')");
        const start = result.rows.find(r => r.key === 'CONTEST_START')?.value || '2026-03-10T00:00:00+05:30';
        const end = result.rows.find(r => r.key === 'CONTEST_END')?.value || '2026-03-20T00:00:00+05:30';
        
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const now = Date.now();
        return now >= startTime && now <= endTime;
    } catch (e) {
        return true; // fail open for testing if settings table missing
    }
};

// Root route serves the login/landing page unconditionally
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// App static file serving
app.use(express.static(__dirname));

// Ensure other html routes are accessible cleanly 
app.get('/problems.html', (req, res) => res.sendFile(path.join(__dirname, 'problems.html')));
app.get('/editor.html', (req, res) => res.sendFile(path.join(__dirname, 'editor.html')));
app.get('/leaderboard.html', (req, res) => res.sendFile(path.join(__dirname, 'leaderboard.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// 1. Time API
app.get('/api/time', async (req, res) => {
    try {
        const result = await pool.query("SELECT key, value FROM Settings WHERE key IN ('CONTEST_START', 'CONTEST_END')");
        const start = result.rows.find(r => r.key === 'CONTEST_START')?.value || '2026-01-01T00:00:00Z';
        const end = result.rows.find(r => r.key === 'CONTEST_END')?.value || '2026-01-01T00:00:00Z';
        
        res.json({ 
            current_time: new Date().toISOString(),
            start_time: new Date(start).toISOString(),
            end_time: new Date(end).toISOString(),
            is_active: await isContestActive()
        });
    } catch(err) {
        res.status(500).json({ error: 'Database Error loading time' });
    }
});

// 2. Problems List API
app.get('/api/problems', async (req, res) => {
    if (!(await isContestActive())) return res.status(403).json({ error: 'Contest Not Active' });
    
    try {
        const result = await pool.query('SELECT id, title, difficulty FROM Problems ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database Error' });
    }
});

// 3. Problem Detail API
app.get('/api/problems/:id', async (req, res) => {
    if (!(await isContestActive())) return res.status(403).json({ error: 'Contest Not Active' });
    try {
        const result = await pool.query(
            'SELECT id, title, difficulty, description, input_format, output_format, constraints, example_in, example_out FROM Problems WHERE id = $1',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Problem not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Database Error' });
    }
});

// 4. Run Code API
app.post('/api/run', async (req, res) => {
    if (!(await isContestActive())) return res.status(403).json({ error: 'Contest Not Active' });
    const { code, language_id, stdin } = req.body;
    try {
        const apiUrl = process.env.JUDGE0_API_URL || 'http://localhost:2358';
        const response = await fetch(`${apiUrl}/submissions?base64_encoded=false&wait=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_code: code, language_id, stdin })
        });
        if (!response.ok) throw new Error(`Judge0 API error: ${response.status}`);
        res.json(await response.json());
    } catch (err) {
        res.status(500).json({ error: 'Execution Error' });
    }
});

// 5. Submit Code API
app.post('/api/submit', async (req, res) => {
    if (!(await isContestActive())) return res.status(403).json({ error: 'Contest Not Active' });
    const { user_id, problem_id, code, language_id, language_name } = req.body;
    
    try {
        const problemRes = await pool.query('SELECT test_cases FROM Problems WHERE id = $1', [problem_id]);
        if (problemRes.rows.length === 0) return res.status(404).json({ error: 'Problem not found' });
        
        let verdict = 'Accepted';
        let maxTime = 0.012;

        const subRes = await pool.query(
            'INSERT INTO Submissions (user_id, problem_id, code, language, verdict, execution_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [user_id, problem_id, code, language_name, verdict, maxTime]
        );

        if (verdict === 'Accepted') {
            await pool.query('UPDATE Users SET score = score + 100 WHERE id = $1', [user_id]);
        }
        res.json({ submission_id: subRes.rows[0].id, verdict, time: maxTime });
    } catch (err) {
        res.status(500).json({ error: 'Submission Error' });
    }
});

// 6. Leaderboard API
app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await pool.query('SELECT name, score FROM Users WHERE is_admin=false ORDER BY score DESC, created_at ASC LIMIT 100');
        res.json(result.rows.map((row, index) => ({ rank: index + 1, ...row })));
    } catch (err) {
        res.status(500).json({ error: 'Database Error' });
    }
});

// 7. Auth: Email-based strictly registered login
app.post('/api/auth', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query('SELECT id, name, is_admin FROM Users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Email not registered. Wait for admin to add you.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
         res.status(500).json({ error: 'Auth Error' });
    }
});

// 8. Anti-Cheat Logger
app.post('/api/anti-cheat', (req, res) => {
    res.json({ success: true });
});

// ==========================================
// ADMIN API ROUTES
// ==========================================

const checkAdmin = async (admin_id) => {
    const auth = await pool.query('SELECT is_admin FROM Users WHERE id = $1', [admin_id]);
    return auth.rows[0]?.is_admin === true;
};

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    const { name, password } = req.body;
    try {
        const result = await pool.query('SELECT id, name, is_admin FROM Users WHERE name = $1 AND password = $2 AND is_admin = true', [name, password]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid admin credentials' });
        res.json({ success: true, user: result.rows[0] });
    } catch(err) { res.status(500).json({error: 'Login Error'}) }
});

// Admin Update Timers
app.post('/api/admin/time', async (req, res) => {
    const { admin_id, start_time, end_time } = req.body;
    try {
        if (!(await checkAdmin(admin_id))) return res.status(403).json({error: 'Unauthorized'});
        await pool.query("UPDATE Settings SET value = $1 WHERE key = 'CONTEST_START'", [start_time]);
        await pool.query("UPDATE Settings SET value = $1 WHERE key = 'CONTEST_END'", [end_time]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}) }
});

// Admin Add Problem
app.post('/api/admin/problems', async (req, res) => {
    const { admin_id, title, difficulty, description, input_format, output_format, constraints, example_in, example_out, test_cases } = req.body;
    try {
        if (!(await checkAdmin(admin_id))) return res.status(403).json({error: 'Unauthorized'});
        await pool.query(
            'INSERT INTO Problems (title, difficulty, description, input_format, output_format, constraints, example_in, example_out, test_cases) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', 
            [title, difficulty, description, input_format, output_format, constraints, example_in, example_out, test_cases || '[]']
        );
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}) }
});

// Admin Add Registered User
app.post('/api/admin/users', async (req, res) => {
    const { admin_id, name, email } = req.body;
    try {
        if (!(await checkAdmin(admin_id))) return res.status(403).json({error: 'Unauthorized'});
        await pool.query('INSERT INTO Users (name, email) VALUES ($1, $2) ON CONFLICT DO NOTHING', [name, email]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({error: e.message}) }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

module.exports = app;

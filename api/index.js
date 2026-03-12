const express = require('express');
const cors = require('cors');
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

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
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
        const headers = { 'Content-Type': 'application/json' };
        
        if (process.env.JUDGE0_API_KEY) {
            headers['X-RapidAPI-Key'] = process.env.JUDGE0_API_KEY;
            try {
                headers['X-RapidAPI-Host'] = new URL(apiUrl).hostname;
            } catch (e) {
                console.error("Invalid JUDGE0_API_URL for Host header:", apiUrl);
            }
        }

        const response = await fetch(`${apiUrl}/submissions?base64_encoded=false&wait=true`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ source_code: code, language_id, stdin })
        });
        if (!response.ok) throw new Error(`Judge0 API error: ${response.status}`);
        res.json(await response.json());
    } catch (err) {
        console.error("Judge0 Error:", err.message);
        res.status(500).json({ error: `Compiler backend error: ${err.message}. Please Check JUDGE0_API_URL.` });
    }
});

// 5. Submit Code API
app.post('/api/submit', async (req, res) => {
    if (!(await isContestActive())) return res.status(403).json({ error: 'Contest Not Active' });
    const { user_id, problem_id, code, language_name, verdict, time } = req.body;
    
    try {
        // Enforce one submission per candidate per problem
        const existing = await pool.query(
            'SELECT id FROM Submissions WHERE user_id = $1 AND problem_id = $2',
            [user_id, problem_id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'You have already submitted this problem.' });
        }
        
        const subRes = await pool.query(
            'INSERT INTO Submissions (user_id, problem_id, code, language, verdict, execution_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [user_id, problem_id, code, language_name, verdict, time || 0]
        );

        if (verdict === 'Accepted') {
            await pool.query('UPDATE Users SET score = score + 100 WHERE id = $1', [user_id]);
        }
        res.json({ submission_id: subRes.rows[0].id, verdict, time });
    } catch (err) {
        console.error("Submit Error:", err.message);
        // Catch DB-level uniqueness violation (race condition safeguard)
        if (err.code === '23505') {
            return res.status(409).json({ error: 'You have already submitted this problem.' });
        }
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
app.post('/api/anti-cheat', async (req, res) => {
    const { user_id, event, count } = req.body;
    try {
        await pool.query('INSERT INTO AntiCheatLogs (user_id, event, count) VALUES ($1, $2, $3)', [user_id, event, count]);
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to log' });
    }
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

// Admin Get Submissions (grouped by candidate)
app.post('/api/admin/submissions', async (req, res) => {
    const { admin_id } = req.body;
    try {
        if (!(await checkAdmin(admin_id))) return res.status(403).json({error: 'Unauthorized'});
        const result = await pool.query(`
            SELECT s.id, u.id as candidate_id, u.name as candidate, p.title as problem,
                   s.language, s.verdict, s.submitted_at
            FROM Submissions s
            JOIN Users u ON s.user_id = u.id
            JOIN Problems p ON s.problem_id = p.id
            ORDER BY u.name ASC, s.submitted_at DESC
            LIMIT 500
        `);

        // Group rows by candidate
        const grouped = {};
        for (const row of result.rows) {
            if (!grouped[row.candidate_id]) {
                grouped[row.candidate_id] = {
                    candidate_id: row.candidate_id,
                    candidate: row.candidate,
                    total: 0,
                    submissions: []
                };
            }
            grouped[row.candidate_id].submissions.push({
                id: row.id,
                problem: row.problem,
                language: row.language,
                verdict: row.verdict,
                submitted_at: row.submitted_at
            });
            grouped[row.candidate_id].total++;
        }

        res.json({ success: true, grouped: Object.values(grouped) });
    } catch (e) { res.status(500).json({error: e.message}) }
});

// Admin Lazy-Load Code for View Code Modal
app.get('/api/admin/submissions/:id/code', async (req, res) => {
    // Simple auth via query param admin_id
    const admin_id = req.query.admin_id;
    try {
        if (!admin_id || !(await checkAdmin(parseInt(admin_id)))) return res.status(403).json({error: 'Unauthorized'});
        const result = await pool.query('SELECT code, language FROM Submissions WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({error: 'Submission not found'});
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({error: e.message}) }
});

// Admin Get Anti-Cheat Logs
app.post('/api/admin/anti-cheat', async (req, res) => {
    const { admin_id } = req.body;
    try {
        if (!(await checkAdmin(admin_id))) return res.status(403).json({error: 'Unauthorized'});
        const result = await pool.query(`
            SELECT a.id, u.name as candidate, a.event, a.count, a.created_at
            FROM AntiCheatLogs a
            JOIN Users u ON a.user_id = u.id
            ORDER BY a.created_at DESC LIMIT 100
        `);
        res.json({ success: true, logs: result.rows });
    } catch (e) { res.status(500).json({error: e.message}) }
});

// Admin Delete Anti-Cheat Log
app.post('/api/admin/anti-cheat/delete', async (req, res) => {
    const { admin_id, log_id } = req.body;
    try {
        if (!(await checkAdmin(admin_id))) return res.status(403).json({error: 'Unauthorized'});
        await pool.query('DELETE FROM AntiCheatLogs WHERE id = $1', [parseInt(log_id)]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({error: e.message}) }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

module.exports = app;

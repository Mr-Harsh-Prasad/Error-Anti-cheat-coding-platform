const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5T4gCWMNylZo@ep-nameless-violet-abv0alyk-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';

async function fix() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log("Connected to database...");
    
    try {
        console.log("Ensuring Users table has all columns...");
        await client.query(`ALTER TABLE Users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE`);
        await client.query(`ALTER TABLE Users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`);
        await client.query(`ALTER TABLE Users ADD COLUMN IF NOT EXISTS password VARCHAR(255)`);
        
        console.log("Ensuring Settings table exists...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS Settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);
        
        console.log("Ensuring AntiCheatLogs table exists...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS AntiCheatLogs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES Users(id),
                event VARCHAR(100) NOT NULL,
                count INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("Ensuring default settings...");
        await client.query(`INSERT INTO Settings (key, value) VALUES ('CONTEST_START', '2026-03-10T00:00:00+05:30') ON CONFLICT (key) DO NOTHING`);
        await client.query(`INSERT INTO Settings (key, value) VALUES ('CONTEST_END', '2026-03-30T00:00:00+05:30') ON CONFLICT (key) DO NOTHING`);

        console.log("Ensuring Harsh is admin...");
        await client.query(`
            INSERT INTO Users (name, email, is_admin, password) 
            VALUES ('Harsh', 'admin@error.com', true, 'error@gfg')
            ON CONFLICT (email) DO UPDATE SET is_admin = true
        `);

        console.log("Database Fix Applied Successfully!");
    } catch (err) {
        console.error("Database Fix Failed:", err);
    } finally {
        await client.end();
    }
}

fix();

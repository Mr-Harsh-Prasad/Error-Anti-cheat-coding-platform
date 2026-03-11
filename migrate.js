const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_5T4gCWMNylZo@ep-nameless-violet-abv0alyk-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require' });

async function migrate() {
    await client.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS AntiCheatLogs (
                id SERIAL PRIMARY KEY, 
                user_id INTEGER REFERENCES Users(id), 
                event VARCHAR(255), 
                count INTEGER, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('AntiCheatLogs table created successfully!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
migrate();

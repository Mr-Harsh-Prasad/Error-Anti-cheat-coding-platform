const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_5T4gCWMNylZo@ep-nameless-violet-abv0alyk-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require' });

async function migrate() {
    await client.connect();
    try {
        console.log('Adding "points" column to Problems table...');
        await client.query('ALTER TABLE Problems ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0');
        console.log('Column added successfully!');

        console.log('Ensuring Settings table exists...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS Settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);
        console.log('Settings table ensured!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}
migrate();

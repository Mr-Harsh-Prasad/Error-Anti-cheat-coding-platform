const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_5T4gCWMNylZo@ep-nameless-violet-abv0alyk-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require' });

async function seed() {
    await client.connect();
    try {
        console.log('Seeding points for problems...');
        await client.query('UPDATE Problems SET points = 50 WHERE id = 1');
        await client.query('UPDATE Problems SET points = 100 WHERE id = 2');
        console.log('Seeding contest settings...');
        await client.query("INSERT INTO Settings (key, value) VALUES ('CONTEST_START', '2026-03-12T00:00:00+05:30') ON CONFLICT (key) DO UPDATE SET value = '2026-03-12T00:00:00+05:30'");
        await client.query("INSERT INTO Settings (key, value) VALUES ('CONTEST_END', '2026-03-20T00:00:00+05:30') ON CONFLICT (key) DO UPDATE SET value = '2026-03-20T00:00:00+05:30'");
        console.log('Seed complete!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
seed();

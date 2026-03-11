const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_5T4gCWMNylZo@ep-nameless-violet-abv0alyk-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require' });

async function seed() {
    await client.connect();
    try {
        await client.query(`
            INSERT INTO Problems (title, difficulty, description, input_format, output_format, constraints, example_in, example_out, test_cases) 
            VALUES (
                'Hello Error 1.0', 
                'Easy', 
                'Write a program that prints exactly "Error 1.0 Crash" to the standard output.', 
                'None', 
                'A single line containing the exact string.', 
                'None', 
                '', 
                'Error 1.0 Crash', 
                '[]' 
            )
        `);
        console.log('Mock problem injected!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
seed();

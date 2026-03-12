-- Database schema for Error 1.0 Coding Contest

CREATE TABLE IF NOT EXISTS Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Problems (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    input_format TEXT NOT NULL,
    output_format TEXT NOT NULL,
    constraints TEXT NOT NULL,
    example_in TEXT NOT NULL,
    example_out TEXT NOT NULL,
    test_cases JSON NOT NULL -- JSON array of objects: { "in": "...", "out": "..." }
);

CREATE TABLE IF NOT EXISTS Settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(id),
    problem_id INTEGER REFERENCES Problems(id),
    code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    verdict VARCHAR(50) NOT NULL,
    execution_time NUMERIC,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_problem UNIQUE (user_id, problem_id)
);

-- Note: In a real contest platform, Users would also have authentication, 
-- but following the simplified spec, name and score are enough.

-- Migration: Enforce one submission per candidate per problem
-- Run this on the live Neon DB to apply the UNIQUE constraint

ALTER TABLE Submissions
ADD CONSTRAINT unique_user_problem UNIQUE (user_id, problem_id);

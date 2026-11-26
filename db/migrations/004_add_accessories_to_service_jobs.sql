-- db/migrations/004_add_accessories_to_service_jobs.sql
-- Add accessories column to service_jobs table to store intake accessories given by customer

ALTER TABLE service_jobs ADD COLUMN IF NOT EXISTS accessories TEXT;

-- Add the `training_permitted` column that the ORM model
-- (app/models/engram.py :: DailyQuestionResponse) reads on EVERY select.
-- It was defined on the model but never created by any migration, so any
-- SELECT of the model against a migrated database fails with
-- "column daily_question_responses.training_permitted does not exist",
-- breaking AI prompts, embeddings, personality, and the marketplace.
--
-- Idempotent: safe whether or not the column was already added out-of-band.
ALTER TABLE public.daily_question_responses
  ADD COLUMN IF NOT EXISTS training_permitted boolean NOT NULL DEFAULT false;

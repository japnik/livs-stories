-- Add language field to voices table (optional but recommended)
ALTER TABLE voices ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pa';

-- Update existing voices to have Punjabi as default
UPDATE voices SET language = 'pa' WHERE language IS NULL;

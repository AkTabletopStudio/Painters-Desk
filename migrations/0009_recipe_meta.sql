-- Recipes are one colour (a short ramp of layers); tutorials are a whole model. Tutorial extras live in meta:
-- { level: 'beginner' | 'intermediate' | 'advanced' | '', time: free text, model: free text }. Recipes keep '{}'.
-- A tutorial step can point at a recipe: steps[].recipe = recipe id (no column needed, it's in the steps JSON).
ALTER TABLE recipes ADD COLUMN meta TEXT NOT NULL DEFAULT '{}';
CREATE INDEX recipes_kind ON recipes(kind, visibility, updated_at);

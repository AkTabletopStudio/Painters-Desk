-- Last paint selection shown on the colour wheel, so it follows the user across devices.
-- JSON {"t":<ms>,"g":[fully ticked range codes],"k":[other ticked paint keys]}; '' = never saved.
ALTER TABLE users ADD COLUMN wheel TEXT NOT NULL DEFAULT '';

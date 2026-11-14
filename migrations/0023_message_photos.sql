-- Photos in Messages: a JSON array of photo ids (see uploadImage) sent with a message, '[]' for none.
-- The Worker checks for this column, so Messages stay text only until it is applied.
ALTER TABLE messages ADD COLUMN images TEXT NOT NULL DEFAULT '[]';

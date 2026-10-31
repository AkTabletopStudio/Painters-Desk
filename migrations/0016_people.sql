-- The Painters list (#/people): everyone with an account shows in it and in its name search, unless they turn
-- this off on their account page. Their profile page stays public either way.
ALTER TABLE users ADD COLUMN findable INTEGER NOT NULL DEFAULT 1;

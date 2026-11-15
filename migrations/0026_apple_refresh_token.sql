-- Sign in with Apple: the refresh token Apple issues, kept only so it can be revoked when the account is deleted
-- (App Store rule 5.1.1(v)). Other providers leave it empty.
ALTER TABLE identities ADD COLUMN refresh_token TEXT;

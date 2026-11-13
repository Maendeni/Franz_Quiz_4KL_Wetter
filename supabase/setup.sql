/*      #########################################################################################################################################################
		Created: 13.11.2026, Marco
		Purpose: Database schema for the language quiz web app (parent login with child profiles and synced learning progress)
		Description: Each parent account (Supabase Auth, e-mail + password) owns one or more child profiles; the quiz progress of each child is stored as one JSON document so it follows the child across devices. Row Level Security limits every account to its own profiles and progress.

		History:
		Date		Who			Change description
		#########################################################################################################################################################  */

-- Run once in the Supabase SQL editor. The script is idempotent and can be run again after changes.


/* ---------------- Tables ---------------- */

CREATE TABLE IF NOT EXISTS public.profiles (
	id				UUID		PRIMARY KEY DEFAULT gen_random_uuid(),
	-- Defaults to the logged-in parent, so the app never has to send it
	owner_id		UUID		NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
	-- First name or nickname only; no further personal data about the children is stored
	name			TEXT		NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 30),
	created_at		TIMESTAMPTZ	NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_profiles_owner_id ON public.profiles (owner_id);

CREATE TABLE IF NOT EXISTS public.progress (
	profile_id		UUID		PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
	-- Same structure as the localStorage object "franz_quiz_v1" (xp, decks, fehler, letztes, laufend, vorlesen)
	data			JSONB		NOT NULL,
	updated_at		TIMESTAMPTZ	NOT NULL DEFAULT NOW()
);


/* ---------------- Access (Row Level Security) ---------------- */

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Explicit grants, because newer Supabase projects no longer expose new tables to the API automatically; anonymous visitors get nothing
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.progress TO authenticated;
REVOKE ALL ON public.profiles, public.progress FROM anon;

-- A parent sees and manages only their own children
DROP POLICY IF EXISTS profiles_own ON public.profiles;
CREATE POLICY profiles_own ON public.profiles
	FOR ALL TO authenticated
	USING (owner_id = auth.uid())
	WITH CHECK (owner_id = auth.uid());

-- Progress belongs to whoever owns the profile
DROP POLICY IF EXISTS progress_own ON public.progress;
CREATE POLICY progress_own ON public.progress
	FOR ALL TO authenticated
	USING (EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = progress.profile_id AND p.owner_id = auth.uid()))
	WITH CHECK (EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = progress.profile_id AND p.owner_id = auth.uid()));


/* ---------------- Keep-alive ---------------- */

-- Free Supabase projects pause after a week without database activity; the GitHub workflow calls this function twice a week
CREATE OR REPLACE FUNCTION public.ping()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
	SELECT 1;
$$;

GRANT EXECUTE ON FUNCTION public.ping() TO anon;

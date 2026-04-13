-- 1. Repoint mentor_profiles FK to public.profiles so PostgREST embed resolves
ALTER TABLE public.mentor_profiles DROP CONSTRAINT mentor_profiles_user_id_fkey;
ALTER TABLE public.mentor_profiles
  ADD CONSTRAINT mentor_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Backfill missing profiles for orphan auth users
INSERT INTO public.profiles (id, first_name, last_name)
SELECT au.id,
       NULLIF(TRIM(au.raw_user_meta_data->>'first_name'), ''),
       NULLIF(TRIM(au.raw_user_meta_data->>'last_name'),  '')
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- 3. Repoint mentorship_requests FKs from empty public.users to public.profiles
ALTER TABLE public.mentorship_requests
  DROP CONSTRAINT mentorship_requests_mentee_id_fkey,
  DROP CONSTRAINT mentorship_requests_mentor_id_fkey;
ALTER TABLE public.mentorship_requests
  ADD CONSTRAINT mentorship_requests_mentee_id_fkey
    FOREIGN KEY (mentee_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT mentorship_requests_mentor_id_fkey
    FOREIGN KEY (mentor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Auto-create profile on new auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (NEW.id,
          NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
          NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'),  ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Notification trigger must run as owner to insert for another user
ALTER FUNCTION public.on_mentorship_request() SECURITY DEFINER;
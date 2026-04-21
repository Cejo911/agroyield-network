-- ============================================================================
-- Migration: DM attachments
--
-- Adds media_type + media_filename to messages so the thread UI can tell an
-- image from a PDF/doc and render the right bubble (inline image vs download
-- chip). media_url already exists on the baseline messages table.
--
-- Also provisions the `message-attachments` storage bucket + RLS so a sender
-- can only drop files under their own userId folder, but both participants can
-- read any file in the bucket (the URLs are obfuscated; the real access
-- control is that you need the message row — which is RLS-gated — to see the
-- URL). Keeping the bucket public matches how business-logos / avatars are
-- handled and lets <Image> render without signed-URL plumbing on every poll.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema: media_type + media_filename
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists media_type     varchar(20),
  add column if not exists media_filename text;

comment on column public.messages.media_type is
  'image | file — drives how the bubble renders. null when body is text-only.';
comment on column public.messages.media_filename is
  'Original filename at upload time. Shown on download chip for non-image attachments.';

-- Relax the implicit "body must be present" expectation: a message is valid
-- if it has body OR media_url. Enforced in the send route, no DB constraint
-- needed beyond what's already there.

-- ---------------------------------------------------------------------------
-- 2. Storage bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', true)
on conflict (id) do update set public = excluded.public;

-- ---------------------------------------------------------------------------
-- 3. RLS on storage.objects for this bucket
-- ---------------------------------------------------------------------------

-- Public read — obfuscated paths, and a recipient needs the message row to
-- get the URL in the first place. Matches business-logos/avatars pattern.
drop policy if exists "message_attachments_select_public" on storage.objects;
create policy "message_attachments_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'message-attachments');

-- INSERT — authenticated user can only upload under their own uid folder.
drop policy if exists "message_attachments_insert_owner" on storage.objects;
create policy "message_attachments_insert_owner"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE — same owner gate (for upsert-style re-uploads).
drop policy if exists "message_attachments_update_owner" on storage.objects;
create policy "message_attachments_update_owner"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE — sender can delete their own files (e.g. if we ever add an "unsend"
-- that removes the blob). Not wired into UI yet but policy is cheap to add.
drop policy if exists "message_attachments_delete_owner" on storage.objects;
create policy "message_attachments_delete_owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

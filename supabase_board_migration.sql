-- ==============================================================================
-- 🚀 MIGRATION: กระดานสนทนา (Discussion Board) & โปรไฟล์ผู้ใช้ (User Profiles)
-- รวมทั้ง: Note Reactions (Like / Dislike), Note Comments, Profile Avatar, Social Links
-- ==============================================================================

-- 1. เพิ่มฟิลด์ในตาราง public.profiles สำหรับ Avatar และ Social Media Links
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS avatar_type text DEFAULT 'icon', -- 'icon' | 'upload'
ADD COLUMN IF NOT EXISTS avatar_icon text DEFAULT 'User', -- ชื่อ Lucide Icon preset
ADD COLUMN IF NOT EXISTS avatar_url text,                 -- URL หรือ Path ใน storage bucket avatars
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS youtube_url text,
ADD COLUMN IF NOT EXISTS tiktok_url text;

-- อนุญาตให้ทุกคน (รวม anon และ authenticated) สามารถดูข้อมูล Profile เพื่อแสดงชื่อ/รูป/socials ในบอร์ด
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public can view profiles'
  ) THEN
    CREATE POLICY "Public can view profiles"
    ON public.profiles FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- 2. ตาราง public.note_reactions (กดชอบ/ไม่ชอบ Like & Dislike)
CREATE TABLE IF NOT EXISTS public.note_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'dislike')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT note_reactions_unique_user_note UNIQUE (note_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_note_reactions_note_id ON public.note_reactions(note_id);
CREATE INDEX IF NOT EXISTS idx_note_reactions_user_id ON public.note_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_note_reactions_type ON public.note_reactions(note_id, type);

ALTER TABLE public.note_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_reactions' AND policyname = 'Public can view note reactions'
  ) THEN
    CREATE POLICY "Public can view note reactions"
    ON public.note_reactions FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_reactions' AND policyname = 'Users can insert their own reactions'
  ) THEN
    CREATE POLICY "Users can insert their own reactions"
    ON public.note_reactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_reactions' AND policyname = 'Users can update their own reactions'
  ) THEN
    CREATE POLICY "Users can update their own reactions"
    ON public.note_reactions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_reactions' AND policyname = 'Users can delete their own reactions'
  ) THEN
    CREATE POLICY "Users can delete their own reactions"
    ON public.note_reactions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. ตาราง public.note_comments (ความคิดเห็นระดับเดียว flat 1)
CREATE TABLE IF NOT EXISTS public.note_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_note_comments_note_id ON public.note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_comments_created_at ON public.note_comments(created_at ASC);

ALTER TABLE public.note_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_comments' AND policyname = 'Public can view note comments'
  ) THEN
    CREATE POLICY "Public can view note comments"
    ON public.note_comments FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_comments' AND policyname = 'Users can insert their own comments'
  ) THEN
    CREATE POLICY "Users can insert their own comments"
    ON public.note_comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_comments' AND policyname = 'Users can update their own comments'
  ) THEN
    CREATE POLICY "Users can update their own comments"
    ON public.note_comments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_comments' AND policyname = 'Users can delete their own comments'
  ) THEN
    CREATE POLICY "Users can delete their own comments"
    ON public.note_comments FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Supabase Storage Bucket สำหรับเก็บ Avatar ผู้ใช้
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read avatars'
  ) THEN
    CREATE POLICY "Public read avatars"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload avatars'
  ) THEN
    CREATE POLICY "Authenticated users can upload avatars"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update avatars'
  ) THEN
    CREATE POLICY "Authenticated users can update avatars"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars')
    WITH CHECK (bucket_id = 'avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete avatars'
  ) THEN
    CREATE POLICY "Authenticated users can delete avatars"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars');
  END IF;
END $$;

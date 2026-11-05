-- ==============================================================================
-- 🛡️ SUPABASE COMPLETE RLS & SECURITY POLICIES MIGRATION
-- ป้องกันการเข้าถึงข้อมูลข้ามบัญชี (BOLA / IDOR) และบังคับใช้ Row Level Security
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ตาราง public.profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
    CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
    CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. ตาราง public.note_categories (หมวดหมู่โน้ต)
-- ------------------------------------------------------------------------------
ALTER TABLE public.note_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- เจ้าของบัญชีสามารถ จัดการหมวดหมู่ของตนเองได้เต็มที่ (CRUD)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'note_categories' AND policyname = 'Users can manage their own categories') THEN
    CREATE POLICY "Users can manage their own categories"
    ON public.note_categories FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- บุคคลทั่วไป (รวมถึง Guest/Anon) สามารถอ่านได้เฉพาะหมวดหมู่ที่เปิดแชร์สาธารณะเท่านั้น
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'note_categories' AND policyname = 'Public can view shared categories') THEN
    CREATE POLICY "Public can view shared categories"
    ON public.note_categories FOR SELECT
    TO anon, authenticated
    USING (is_shared = true AND share_token IS NOT NULL);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. ตาราง public.notes (บันทึกข้อความ)
-- ------------------------------------------------------------------------------
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- เจ้าของบัญชีสามารถ ดู/เพิ่ม/แก้ไข/ลบ โน้ตของตนเองได้เต็มที่ (CRUD)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Users can manage their own notes') THEN
    CREATE POLICY "Users can manage their own notes"
    ON public.notes FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- บุคคลทั่วไป สามารถอ่านได้เฉพาะโน้ตที่เปิดแชร์ หรืออยู่ในหมวดหมู่ที่เปิดแชร์
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Public can view shared notes') THEN
    CREATE POLICY "Public can view shared notes"
    ON public.notes FOR SELECT
    TO anon, authenticated
    USING (
      (is_shared = true AND share_token IS NOT NULL)
      OR EXISTS (
        SELECT 1 FROM public.note_categories
        WHERE public.note_categories.id = public.notes.category_id
        AND public.note_categories.is_shared = true
        AND public.note_categories.share_token IS NOT NULL
      )
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. ตาราง public.projects (โปรเจกต์)
-- ------------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- เจ้าของบัญชีสามารถ ดู/เพิ่ม/แก้ไข/ลบ โปรเจกต์ของตนเองเท่านั้น
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Users can manage their own projects') THEN
    CREATE POLICY "Users can manage their own projects"
    ON public.projects FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. ตาราง public.tasks (งานย่อยในโปรเจกต์)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- ผู้ใช้สามารถ จัดการ tasks ได้เฉพาะเมื่อ task นั้นอยู่ใน project ที่ตนเองเป็นเจ้าของ
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'Users can manage tasks in their own projects') THEN
    CREATE POLICY "Users can manage tasks in their own projects"
    ON public.tasks FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.projects
        WHERE public.projects.id = public.tasks.project_id
        AND public.projects.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.projects
        WHERE public.projects.id = public.tasks.project_id
        AND public.projects.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. ตาราง public.daily_logs และ public.log_items (ปฏิทิน/บันทึกรายวัน)
-- ------------------------------------------------------------------------------
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_logs' AND policyname = 'Users can manage their own daily_logs') THEN
    CREATE POLICY "Users can manage their own daily_logs"
    ON public.daily_logs FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'log_items' AND policyname = 'Users can manage their own log_items') THEN
    CREATE POLICY "Users can manage their own log_items"
    ON public.log_items FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. สิทธิ์ความปลอดภัยบน Supabase Storage (Buckets: note_attachments, logo)
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  -- ผู้ใช้ที่ล็อกอินสามารถอัปโหลดไฟล์ของตนเองได้
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload note attachments') THEN
    CREATE POLICY "Authenticated users can upload note attachments"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id IN ('note_attachments', 'logo'));
  END IF;

  -- ผู้ใช้ที่ล็อกอินสามารถลบ/แก้ไฟล์ใน Storage ได้
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can manage storage files') THEN
    CREATE POLICY "Authenticated users can manage storage files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id IN ('note_attachments', 'logo'));
  END IF;

  -- อนุญาตให้อ่านไฟล์ได้
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read note_attachments') THEN
    CREATE POLICY "Public read note_attachments"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'note_attachments');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read logo') THEN
    CREATE POLICY "Public read logo"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'logo');
  END IF;
END $$;

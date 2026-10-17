-- ==============================================================================
-- 🚀 MIGRATION: ระบบแชร์ข้อมูล (Share System) ราย Note และ ราย Category
-- รองรับทั้ง Next.js Server Actions และ Public Anonymous View-Only
-- ==============================================================================

-- 1. เพิ่มฟิลด์การแชร์ในตาราง public.notes
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token text UNIQUE DEFAULT NULL;

-- 2. เพิ่มฟิลด์การแชร์ในตาราง public.note_categories
ALTER TABLE public.note_categories
ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token text UNIQUE DEFAULT NULL;

-- 3. สร้าง Index เพื่อประสิทธิภาพการค้นหาด้วย share_token
CREATE INDEX IF NOT EXISTS idx_notes_share_token ON public.notes(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_categories_share_token ON public.note_categories(share_token) WHERE share_token IS NOT NULL;

-- 4. ตั้งค่า RLS (Row Level Security) สำหรับการเข้าถึงแบบ Public (Read-Only)
-- หมายเหตุ: หากโปรเจกต์เปิด RLS คำสั่งด้านล่างนี้จะอนุญาตให้ผู้ใช้ทั่วไป (anon) อ่านเฉพาะข้อมูลที่ถูกเปิดแชร์

-- 4.1 อนุญาตให้อ่าน Category ที่เปิดแชร์ (is_shared = true)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'note_categories' AND policyname = 'Public can view shared categories'
  ) THEN
    CREATE POLICY "Public can view shared categories"
    ON public.note_categories
    FOR SELECT
    TO anon, authenticated
    USING (is_shared = true AND share_token IS NOT NULL);
  END IF;
END $$;

-- 4.2 อนุญาตให้อ่าน Note ที่เปิดแชร์โดยตรง หรืออยู่ใน Category ที่เปิดแชร์
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notes' AND policyname = 'Public can view shared notes'
  ) THEN
    CREATE POLICY "Public can view shared notes"
    ON public.notes
    FOR SELECT
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

-- 5. สิทธิ์การเข้าถึงไฟล์ใน Storage (กรณีเปิดแชร์ ให้ผู้รับชมดาวน์โหลด/ดูไฟล์แนบได้)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read note_attachments'
  ) THEN
    CREATE POLICY "Public read note_attachments"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'note_attachments');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read logo'
  ) THEN
    CREATE POLICY "Public read logo"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'logo');
  END IF;
END $$;

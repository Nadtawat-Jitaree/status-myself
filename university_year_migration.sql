-- ==============================================================================
-- 🚀 MIGRATION: เพิ่มการจัดกลุ่มตามชั้นปี (Year 1-4) และภาคเรียน (Semester 1-3)
-- สำหรับระบบโน้ตมหาวิทยาลัย (School Notes)
-- ==============================================================================

-- 1. เพิ่มคอลัมน์ year ในตาราง public.note_categories
-- ค่าที่เป็นไปได้: 1, 2, 3, 4 (หรือ NULL สำหรับโน้ตทั่วไป หรือหมวดหมู่ที่ไม่ระบุชั้นปี)
ALTER TABLE public.note_categories
ADD COLUMN IF NOT EXISTS year integer DEFAULT NULL;

-- 2. เพิ่มคอลัมน์ semester ในตาราง public.note_categories
-- ค่าที่เป็นไปได้: 1 (เทอม 1), 2 (เทอม 2), 3 (ฤดูร้อน) หรือ NULL
ALTER TABLE public.note_categories
ADD COLUMN IF NOT EXISTS semester integer DEFAULT NULL;

-- 3. สร้าง Index เพื่อเพิ่มความเร็วในการ query แยกตามชั้นปีและเทอม
CREATE INDEX IF NOT EXISTS idx_note_categories_year ON public.note_categories(year);
CREATE INDEX IF NOT EXISTS idx_note_categories_semester ON public.note_categories(semester);

-- 4. อัปเดตคำอธิบายคอลัมน์ (Comment)
COMMENT ON COLUMN public.note_categories.year IS 'ชั้นปีของหมวดหมู่วิชา เช่น 1=ปี1, 2=ปี2, 3=ปี3, 4=ปี4 (NULL สำหรับทั่วไป)';
COMMENT ON COLUMN public.note_categories.semester IS 'ภาคเรียนของหมวดหมู่วิชา เช่น 1=เทอม 1, 2=เทอม 2, 3=เทอมฤดูร้อน (NULL สำหรับไม่ระบุ)';

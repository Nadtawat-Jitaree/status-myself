-- ==============================================================================
-- 🕒 TASK & NOTE AUDIT & COMPLETION MIGRATION
-- เพิ่ม created_by, updated_by, completed_at ให้กับ tasks และ notes
-- ==============================================================================

-- 1. เพิ่มคอลัมน์ในตาราง public.tasks
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.tasks 
      ADD COLUMN created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.tasks 
      ADD COLUMN updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.tasks 
      ADD COLUMN completed_at timestamp with time zone;
  END IF;
END $$;

-- Backfill ข้อมูลเก่าของ tasks: ดึง user_id จาก projects มาใส่ใน created_by และ updated_by
UPDATE public.tasks t
SET 
  created_by = COALESCE(t.created_by, p.user_id),
  updated_by = COALESCE(t.updated_by, p.user_id),
  completed_at = CASE 
    WHEN t.status = 'done' AND t.completed_at IS NULL THEN COALESCE(t.updated_at, t.created_at, now())
    ELSE t.completed_at 
  END
FROM public.projects p
WHERE t.project_id = p.id;

-- 2. เพิ่มคอลัมน์ในตาราง public.notes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notes' 
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.notes 
      ADD COLUMN created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notes' 
      AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE public.notes 
      ADD COLUMN updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'notes' 
      AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.notes 
      ADD COLUMN completed_at timestamp with time zone;
  END IF;
END $$;

-- Backfill ข้อมูลเก่าของ notes: ดึง user_id มาใส่ใน created_by และ updated_by
UPDATE public.notes
SET 
  created_by = COALESCE(created_by, user_id),
  updated_by = COALESCE(updated_by, user_id),
  completed_at = CASE 
    WHEN status = 'เสร็จสิ้น' AND completed_at IS NULL THEN COALESCE(updated_at, created_at, now())
    ELSE completed_at 
  END;

-- 3. สร้าง Index เพื่อประสิทธิภาพในการ Query และ Sorting
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON public.tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_by ON public.tasks(updated_by);
CREATE INDEX IF NOT EXISTS idx_notes_completed_at ON public.notes(completed_at);
CREATE INDEX IF NOT EXISTS idx_notes_updated_by ON public.notes(updated_by);

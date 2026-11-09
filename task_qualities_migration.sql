-- ==============================================================================
-- 🎯 TASK QUALITIES & TRANSACTIONS MIGRATION
-- เพิ่มคุณสมบัติ (Qualities) ให้กับ Task ในหน้าโปรเจกต์ และเชื่อมโยงแต้มกับ Transactions
-- ==============================================================================

-- 1. ปรับปรุงตาราง public.quality_transactions
-- ให้ note_id เป็น NULL ได้ และเพิ่มฟิลด์สำหรับเชื่อมโยงกับ task และ project
ALTER TABLE public.quality_transactions
  ALTER COLUMN note_id DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quality_transactions' 
      AND column_name = 'task_id'
  ) THEN
    ALTER TABLE public.quality_transactions 
      ADD COLUMN task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quality_transactions' 
      AND column_name = 'task_title'
  ) THEN
    ALTER TABLE public.quality_transactions 
      ADD COLUMN task_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quality_transactions' 
      AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.quality_transactions 
      ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'quality_transactions' 
      AND column_name = 'project_name'
  ) THEN
    ALTER TABLE public.quality_transactions 
      ADD COLUMN project_name text;
  END IF;
END $$;

-- 2. สร้างตาราง public.task_qualities สำหรับเก็บคุณสมบัติที่ผูกกับแต่ละ Task
CREATE TABLE IF NOT EXISTS public.task_qualities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  quality_id uuid NOT NULL,
  user_id uuid NOT NULL,
  level integer NOT NULL CHECK (level IN (1, 3, 5)),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT task_qualities_pkey PRIMARY KEY (id),
  CONSTRAINT task_qualities_task_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_qualities_quality_fk FOREIGN KEY (quality_id) REFERENCES public.qualities(id) ON DELETE CASCADE,
  CONSTRAINT task_qualities_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT task_qualities_task_quality_unique UNIQUE (task_id, quality_id)
);

-- Index เพื่อความรวดเร็วในการค้นหา
CREATE INDEX IF NOT EXISTS idx_task_qualities_task_id ON public.task_qualities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_qualities_user_id ON public.task_qualities(user_id);
CREATE INDEX IF NOT EXISTS idx_quality_transactions_task_id ON public.quality_transactions(task_id);

-- 3. Row Level Security (RLS) สำหรับ task_qualities
ALTER TABLE public.task_qualities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'task_qualities' 
      AND policyname = 'Users can manage their own task qualities'
  ) THEN
    CREATE POLICY "Users can manage their own task qualities"
    ON public.task_qualities FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4. DB Trigger คำนวณแต้มอัตโนมัติเมื่อมีการ Insert หรือ Delete ใน quality_transactions
CREATE OR REPLACE FUNCTION public.handle_quality_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.qualities
    SET points = points + NEW.points_delta,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.quality_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.qualities
    SET points = GREATEST(0, points - OLD.points_delta),
        updated_at = timezone('utc'::text, now())
    WHERE id = OLD.quality_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_quality_transactions ON public.quality_transactions;
CREATE TRIGGER trg_quality_transactions
AFTER INSERT OR DELETE ON public.quality_transactions
FOR EACH ROW EXECUTE FUNCTION public.handle_quality_transaction();

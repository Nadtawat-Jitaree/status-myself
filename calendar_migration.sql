-- ==============================================================================
-- 🚀 MIGRATION: ระบบบันทึกรายวันและปฏิทิน (Daily Logs & Calendar System)
-- ==============================================================================

-- 1. สร้างตาราง daily_logs (สำหรับบันทึกภาพรวมรายวัน, Mood, Note สรุป)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    summary TEXT,
    mood VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT daily_logs_user_date_unique UNIQUE(user_id, date)
);

-- 2. สร้างตาราง log_items (สำหรับรายการกิจกรรม/งานย่อย ติ๊กทำแล้ว/สิ่งที่ทำไป)
CREATE TABLE IF NOT EXISTS public.log_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_log_id UUID REFERENCES public.daily_logs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    status VARCHAR(20) DEFAULT 'todo',
    priority VARCHAR(10) DEFAULT 'medium',
    start_time TIME,
    end_time TIME,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 3. สร้าง Index เพื่อประสิทธิภาพในการค้นหาและกรอง
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON public.daily_logs (user_id, date);
CREATE INDEX IF NOT EXISTS idx_log_items_user_date ON public.log_items (user_id, date);
CREATE INDEX IF NOT EXISTS idx_log_items_status ON public.log_items (user_id, status);
CREATE INDEX IF NOT EXISTS idx_log_items_category ON public.log_items (user_id, category);
CREATE INDEX IF NOT EXISTS idx_log_items_tags ON public.log_items USING GIN (tags);

-- 4. เปิดใช้งาน RLS (Row Level Security)
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_items ENABLE ROW LEVEL SECURITY;

-- 5. กำหนดนโยบาย RLS ให้ผู้ใช้จัดการเฉพาะข้อมูลของตนเอง
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_logs' AND policyname = 'Users can manage their own daily_logs') THEN
    CREATE POLICY "Users can manage their own daily_logs"
    ON public.daily_logs
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'log_items' AND policyname = 'Users can manage their own log_items') THEN
    CREATE POLICY "Users can manage their own log_items"
    ON public.log_items
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

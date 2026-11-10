-- ==============================================================================
-- ⚡ PERFORMANCE OPTIMIZATION INDEXES (NJ NOTES & DISCUSSION BOARD)
-- ปรับปรุงความเร็ว Algorithm ในการ Query, Sorting, Filtering และ Join
-- ==============================================================================

-- 1. Index สำหรับหน้า "โน๊ตทั่วไป" และ "โน๊ตมหาวิทยาลัย" (/system/notes)
-- ช่วยให้การค้นหาโน้ตตาม user_id เรียงตาม is_pinned และ created_at เป็น O(log N) แทน Sequential Scan
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned_created 
ON public.notes (user_id, is_pinned DESC, created_at DESC);

-- Index สำหรับ Foreign Key category_id เพื่อเพิ่มความเร็วในการ Join กับ note_categories
CREATE INDEX IF NOT EXISTS idx_notes_category_id 
ON public.notes (category_id);

-- Index สำหรับค้นหาหมวดหมู่ตามประเภทโน้ต (normal vs school)
CREATE INDEX IF NOT EXISTS idx_note_categories_user_type_created
ON public.note_categories (user_id, note_type, created_at DESC);

-- Index สำหรับการกรองชั้นปีและภาคเรียนของโน้ตมหาวิทยาลัย
CREATE INDEX IF NOT EXISTS idx_note_categories_school_year_sem
ON public.note_categories (user_id, note_type, year, semester);

-- 2. Index สำหรับหน้า "กระดานสนทนา" (/board)
-- Partial Index สำหรับโน้ตที่เปิดแชร์สาธารณะ (Composite Index for Fast Board Pagination)
CREATE INDEX IF NOT EXISTS idx_notes_shared_board
ON public.notes (created_at DESC)
WHERE is_shared = true AND share_token IS NOT NULL;

-- Index สำหรับกรอง "โน้ตของฉัน" บนกระดานสนทนา
CREATE INDEX IF NOT EXISTS idx_notes_user_board
ON public.notes (user_id, is_shared, created_at DESC);

-- 3. Index สำหรับ Note Reactions (Like / Dislike)
CREATE INDEX IF NOT EXISTS idx_note_reactions_note_type
ON public.note_reactions (note_id, type);

CREATE INDEX IF NOT EXISTS idx_note_reactions_user_note
ON public.note_reactions (user_id, note_id);

-- 4. Index สำหรับ Note Comments
CREATE INDEX IF NOT EXISTS idx_note_comments_note_created
ON public.note_comments (note_id, created_at ASC);

-- 5. Index สำหรับ Quality Transactions & Note Qualities
CREATE INDEX IF NOT EXISTS idx_note_qualities_note_id
ON public.note_qualities (note_id);

CREATE INDEX IF NOT EXISTS idx_quality_transactions_note_id
ON public.quality_transactions (note_id, user_id);

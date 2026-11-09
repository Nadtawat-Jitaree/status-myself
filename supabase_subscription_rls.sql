-- ==============================================================================
-- 💳 SUPABASE RLS & SECURITY POLICIES: SUBSCRIPTION & PAYMENT
-- ==============================================================================

-- 1. เปิดใช้งาน RLS ให้ตาราง subscription_history
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- 2. นโยบาย (Policy) ให้ User สามารถดูประวัติการชำระเงินของตัวเองได้เท่านั้น (SELECT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscription_history' 
    AND policyname = 'Users can view their own subscription history'
  ) THEN
    CREATE POLICY "Users can view their own subscription history"
    ON public.subscription_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. นโยบาย (Policy) สำหรับ Service Role (Stripe Webhook / Server Backend)
-- โดยปกติ Service Role จะ Bypass RLS อยู่แล้ว แต่สร้างไว้เพื่อความชัดเจน
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscription_history' 
    AND policyname = 'Service role can manage all subscription history'
  ) THEN
    CREATE POLICY "Service role can manage all subscription history"
    ON public.subscription_history FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. ป้องกัน User แอบแก้ฟิลด์ role / expires_at ในตาราง profiles เองผ่าน Client
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_subscription_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- หากผู้ใช้ทั่วไป (authenticated) พยายามแก้ role, subscription_plan, expires_at, subscribed_at, stripe_*
  -- ให้คงค่าเดิมไว้ ป้องกันการโกงสิทธิ์ Premium ผ่าน DevTools หรือ Supabase JS Client
  IF auth.role() = 'authenticated' THEN
    NEW.role := OLD.role;
    NEW.subscription_plan := OLD.subscription_plan;
    NEW.subscribed_at := OLD.subscribed_at;
    NEW.expires_at := OLD.expires_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_subscription_fields ON public.profiles;

CREATE TRIGGER trg_protect_profile_subscription_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_subscription_fields();

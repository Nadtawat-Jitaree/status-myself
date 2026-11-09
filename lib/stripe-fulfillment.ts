import Stripe from "stripe";
import { PLANS } from "./stripe";
import { createAdminClient } from "./supabase/admin";

/**
 * ฟังก์ชันสำหรับประมวลผลการสั่งซื้อและอัปเกรดสิทธิ์ Premium ให้ผู้ใช้
 * ปลอดภัย ใช้งานได้ทั้งจาก Stripe Webhook และ Success Page (Idempotent)
 * ป้องกันการกด F5 ซ้ำ หรือ Replay attack โดยตรวจสอบ stripe_session_id ทุกครั้ง
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  // ตรวจสอบสถานะการจ่ายเงิน
  if (session.payment_status !== "paid") {
    return false;
  }

  const adminSupabase = createAdminClient();

  // 0. IDEMPOTENCY CHECK: ตรวจสอบว่า Checkout Session ID นี้เคยประมวลผลไปแล้วหรือไม่
  // หากเคยบันทึกใน subscription_history แล้ว ให้ return true ทันที โดยไม่บวกวันเพิ่มเด็ดขาด
  const { data: existingSessions } = await adminSupabase
    .from("subscription_history")
    .select("id")
    .eq("stripe_session_id", session.id)
    .limit(1);

  if (existingSessions && existingSessions.length > 0) {
    console.log(
      `[Stripe Fulfillment] Session ${session.id} already fulfilled. Skipping duplicate extension.`
    );
    return true;
  }

  // 1. หา User ID (จาก metadata, client_reference_id หรือค้นจาก email ใน Supabase)
  let userId = session.metadata?.user_id || session.client_reference_id;

  if (!userId && session.customer_details?.email) {
    const { data: usersData } = await adminSupabase.auth.admin.listUsers();
    const matched = usersData?.users.find(
      (u) =>
        u.email?.toLowerCase() ===
        session.customer_details?.email?.toLowerCase()
    );
    if (matched) {
      userId = matched.id;
    }
  }

  if (!userId) {
    console.error("Could not find user for session:", session.id);
    return false;
  }

  // 2. ระบุแพ็กเกจ (จาก metadata หรือจากยอดเงิน: 5000 = monthly, 50000 = yearly)
  let plan = session.metadata?.plan as "monthly" | "yearly";
  if (!plan || !PLANS[plan]) {
    plan =
      session.amount_total && session.amount_total >= 40000
        ? "yearly"
        : "monthly";
  }

  const planConfig = PLANS[plan];
  const now = new Date();

  // ดึงข้อมูลเดิมของ User เพื่อตรวจสอบว่ามีวันหมดอายุเดิมที่ยังไม่หมดหรือไม่
  const { data: currentProfile } = await adminSupabase
    .from("profiles")
    .select("role, expires_at, subscribed_at")
    .eq("id", userId)
    .single();

  const currentExpiresAt = currentProfile?.expires_at
    ? new Date(currentProfile.expires_at)
    : null;

  // หากผู้ใช้มีวันหมดอายุเดิมที่ยังไม่หมด (currentExpiresAt > now) ให้บวกเวลาต่อยอดจากเดิม
  // หากยังไม่เคยมี หรือหมดอายุไปแล้ว ให้เริ่มนับจากเวลาปัจจุบัน (now)
  const baseTime =
    currentExpiresAt && currentExpiresAt.getTime() > now.getTime()
      ? currentExpiresAt
      : now;

  const expiresAt = new Date(
    baseTime.getTime() + planConfig.days * 24 * 60 * 60 * 1000
  );

  const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  // วันที่เริ่มสมัคร (หากเคยมีแล้วให้ใช้วันเดิม หากเพิ่งเคยสมัครให้ใช้วันนี้)
  const subscribedAt =
    currentProfile?.subscribed_at || now.toISOString();

  // 3. บันทึกประวัติในตาราง subscription_history เป็นด่านแรกเพื่อป้องกัน Concurrency / Duplicate
  const { error: insertErr } = await adminSupabase
    .from("subscription_history")
    .insert({
      user_id: userId,
      stripe_session_id: session.id,
      stripe_payment_intent: paymentIntentId,
      plan: plan,
      amount: session.amount_total || planConfig.price,
      currency: session.currency || "thb",
      status: "paid",
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });

  if (insertErr) {
    console.error(
      "[Stripe Fulfillment] Failed to insert subscription history (possible concurrent duplicate):",
      insertErr
    );
    return true; // ป้องกันการบวกเวลาซ้ำในกรณีมี race condition
  }

  // 4. อัปเดตข้อมูลผู้ใช้ในตาราง profiles เป็น premium และบันทึกวันหมดอายุ
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      role: "premium",
      subscription_plan: plan,
      subscribed_at: subscribedAt,
      expires_at: expiresAt.toISOString(),
      stripe_customer_id: customerId,
      updated_at: now.toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    console.error("Fulfill error updating profile:", profileError);
    return false;
  }

  return true;
}

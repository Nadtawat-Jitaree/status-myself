import Stripe from "stripe";
import { PLANS } from "./stripe";
import { createAdminClient } from "./supabase/admin";

/**
 * ฟังก์ชันสำหรับประมวลผลการสั่งซื้อและอัปเกรดสิทธิ์ Premium ให้ผู้ใช้
 * ปลอดภัย ใช้งานได้ทั้งจาก Stripe Webhook และ Success Page (Idempotent)
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  // ตรวจสอบสถานะการจ่ายเงิน
  if (session.payment_status !== "paid") {
    return false;
  }

  const adminSupabase = createAdminClient();

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
  const expiresAt = new Date(
    now.getTime() + planConfig.days * 24 * 60 * 60 * 1000
  );

  const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  // 3. อัปเดตข้อมูลผู้ใช้ในตาราง profiles เป็น premium
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      role: "premium",
      subscription_plan: plan,
      subscribed_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      stripe_customer_id: customerId,
      updated_at: now.toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    console.error("Fulfill error updating profile:", profileError);
    return false;
  }

  // 4. บันทึกประวัติในตาราง subscription_history (ป้องกันซ้ำซ้อนด้วย stripe_session_id)
  const { data: existing } = await adminSupabase
    .from("subscription_history")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (!existing) {
    await adminSupabase.from("subscription_history").insert({
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
  }

  return true;
}

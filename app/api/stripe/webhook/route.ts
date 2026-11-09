import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

// GET handler สำหรับตรวจสอบว่า endpoint ทำงานได้
export async function GET() {
  return NextResponse.json({ ok: true, service: "stripe-webhook" });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  // ตรวจสอบความถูกต้องของ Webhook Signature
  if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }
  } else {
    // ในโหมด Development หากยังไม่ได้ตั้ง STRIPE_WEBHOOK_SECRET
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch (err: any) {
      return NextResponse.json(
        { error: "Invalid payload format" },
        { status: 400 }
      );
    }
  }

  // จัดการ Event เมื่อชำระเงินสำเร็จ
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { fulfillCheckoutSession } = await import("@/lib/stripe-fulfillment");
    await fulfillCheckoutSession(session);
  }

  return NextResponse.json({ received: true });
}

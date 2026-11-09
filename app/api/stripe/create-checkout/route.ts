import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนทำการสั่งซื้อ" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const planId = body?.plan as "monthly" | "yearly";

    if (!planId || !PLANS[planId]) {
      return NextResponse.json(
        { error: "กรุณาเลือกแพ็กเกจที่ถูกต้อง (monthly หรือ yearly)" },
        { status: 400 }
      );
    }

    const selectedPlan = PLANS[planId];

    // ดึงโปรไฟล์เพื่อหา stripe_customer_id เดิม
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, display_name, username")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // ถ้ายังไม่มี Stripe Customer ให้สร้างขึ้นใหม่
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          name: profile?.display_name || profile?.username || user.email,
          metadata: {
            supabase_user_id: user.id,
          },
        });
        customerId = customer.id;

        // บันทึก stripe_customer_id ลงในตาราง profiles
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      } catch (custErr) {
        console.warn("Could not create/save stripe customer:", custErr);
      }
    }

    // กำหนด Base URL ของระบบ
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    // สร้าง Checkout Session
    // รองรับทั้งแบบระบุ Price ID และ Dynamic price_data ในกรณีที่ผู้ใช้ยังไม่ได้สร้าง Price ใน Stripe Dashboard
    const lineItem = selectedPlan.priceId
      ? { price: selectedPlan.priceId, quantity: 1 }
      : {
          price_data: {
            currency: "thb",
            product_data: {
              name: `NJ Notes ${selectedPlan.name}`,
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.price,
          },
          quantity: 1,
        };

    const sessionParams: any = {
      ui_mode: "hosted_page",
      mode: "payment",
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan: planId,
      },
      billing_address_collection: "auto",
      phone_number_collection: {
        enabled: false,
      },
      automatic_tax: {
        enabled: false,
      },
      allow_promotion_codes: false,
      submit_type: "auto",
      integration_identifier: "hosted_mobile_app_0001",
      origin_context: "mobile_app",
      success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscription/cancel`,
      line_items: [lineItem],
    };

    if (sessionParams.mode === "subscription") {
      sessionParams.payment_method_collection = "always";
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Create checkout session error:", err);
    return NextResponse.json(
      { error: err.message || "เกิดข้อผิดพลาดในการสร้างระบบชำระเงิน" },
      { status: 500 }
    );
  }
}

import Stripe from "stripe";

// ตรวจสอบและสร้าง instance ของ Stripe
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder"
);

export interface PlanConfig {
  id: "monthly" | "yearly";
  name: string;
  price: number; // สตางค์ เช่น 5000 = 50 บาท
  displayPrice: number; // บาท
  periodLabel: string;
  days: number;
  priceId?: string;
  description: string;
}

export const PLANS: Record<"monthly" | "yearly", PlanConfig> = {
  monthly: {
    id: "monthly",
    name: "พรีเมี่ยมรายเดือน",
    price: 5000, // 50 บาท (5,000 สตางค์)
    displayPrice: 50,
    periodLabel: "เดือน",
    days: 30,
    priceId: process.env.STRIPE_PRICE_MONTHLY,
    description: "เข้าถึงฟีเจอร์ทั้งหมดของระบบ NJ Notes ได้ไม่จำกัด 30 วัน",
  },
  yearly: {
    id: "yearly",
    name: "พรีเมี่ยมรายปี",
    price: 50000, // 500 บาท (50,000 สตางค์)
    displayPrice: 500,
    periodLabel: "ปี",
    days: 365,
    priceId: process.env.STRIPE_PRICE_YEARLY,
    description: "สุดคุ้ม! จ่ายเพียง 500 บาท/ปี ใช้งานได้ยาวนาน 365 วัน (ประหยัด 100 บาท)",
  },
};

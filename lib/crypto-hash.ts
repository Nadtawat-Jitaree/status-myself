import crypto from "crypto";

/**
 * ระบุเวอร์ชันของ Token
 * - v1: Legacy token สุ่ม 16 ตัวอักษรจาก Math.random() (เช่น n_abc123456789def0)
 * - v2: Cryptographic Secure SHA-256 Token (เช่น n_a1b2c3d4e5f6... ความยาว 32+ ตัวอักษร)
 */
export type TokenVersion = "v1" | "v2";

/**
 * ตรวจสอบเวอร์ชันของ Share Token
 */
export function detectTokenVersion(token: string): TokenVersion {
  if (!token) return "v1";
  const parts = token.split("_");
  if (parts.length >= 2 && parts[1].length >= 32) {
    return "v2";
  }
  return "v1";
}

/**
 * สร้าง Cryptographically Secure Hash Token
 * ใช้ CSPRNG (crypto.randomBytes) ผสมผสานกับ SHA-256 Hashing
 * ได้ Token ที่คาดเดาไม่ได้ (Unpredictable) และทนทานต่อ Brute-Force
 */
export function generateSecureToken(prefix: "n" | "c"): string {
  // สร้าง random entropy 32 bytes (256 bits)
  const randomEntropy = crypto.randomBytes(32);
  const timestamp = Date.now().toString(36);
  
  // Hashing ด้วย SHA-256
  const hash = crypto
    .createHash("sha256")
    .update(randomEntropy)
    .update(timestamp)
    .digest("hex")
    .substring(0, 32); // ตัด 32 hex chars (128-bit security สำหรับ URL identifier)

  return `${prefix}_${hash}`;
}

/**
 * คำนวณ SHA-256 Hash จาก Buffer หรือ ArrayBuffer ของไฟล์
 * ใช้สำหรับ Content Addressable Naming และ Duplicate Detection
 */
export function calculateContentHash(buffer: Buffer | ArrayBuffer): string {
  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return crypto.createHash("sha256").update(nodeBuffer).digest("hex");
}

/**
 * สร้างชื่อไฟล์ที่มีการ Hash เพื่อป้องกัน File Collision และ Enumerate Attack
 */
export function generateHashedFileName(originalName: string, contentBuffer?: Buffer): string {
  const ext = originalName.split(".").pop()?.toLowerCase() || "bin";
  
  let contentHash = "";
  if (contentBuffer) {
    contentHash = calculateContentHash(contentBuffer).substring(0, 16);
  } else {
    contentHash = crypto.randomBytes(8).toString("hex");
  }

  const salt = crypto.randomBytes(4).toString("hex");
  return `${contentHash}_${salt}.${ext}`;
}

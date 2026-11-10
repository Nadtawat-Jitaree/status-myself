import { THAI_BAD_WORDS, WHITELIST_SAFE_WORDS } from "./bad-words-dict";

export interface ModerationResult {
  isClean: boolean;
  flaggedWords: string[];
}

export interface ShareValidationResult {
  isClean: boolean;
  flaggedWords: string[];
  errorMessage?: string;
}

/**
 * ฟังก์ชันทำความสะอาดและปรับรูปแบบข้อความ (Text Normalization Pipeline)
 * เพื่อรับมือกับเทคนิคการเลี่ยงคำหยาบ (Bypass / Evasion)
 */
export function normalizeProfanityText(text: string): {
  cleanText: string;
  collapsedText: string;
} {
  if (!text) {
    return { cleanText: "", collapsedText: "" };
  }

  // 1. ถอดแท็ก HTML กรณีข้อมูลถูกส่งมาจาก Rich-text Editor
  let result = text.replace(/<[^>]*>/g, " ");

  // 2. กำจัด Zero-Width Characters และอักขระล่องหนที่มักใช้แทรกระหว่างคำ
  result = result.replace(/[\u200B-\u200D\uFEFF\u00A0\u2060\u200E\u200F]/g, "");

  // 3. แทนที่คำใน Whitelist ด้วย Token ปลอดภัยชั่วคราว เพื่อป้องกัน False Positives
  // เช่น "แกงกะหรี่" จะไม่โดนคำว่า "กะหรี่", "หอยเม่น" จะไม่โดนคำว่า "หี" หรือ "หอย"
  WHITELIST_SAFE_WORDS.forEach((safeWord, index) => {
    if (result.includes(safeWord)) {
      const mask = `___SAFE_${index}___`;
      result = result.split(safeWord).join(mask);
    }
  });

  // 4. บีบอัดวรรณยุกต์ซ้อน (Stacked Tone Marks) ให้เหลือตัวแรกตัวเดียว
  result = result.replace(/([\u0E48-\u0E4C])[\u0E48-\u0E4C]+/g, "$1");

  // 5. บีบอัดสระที่พิมพ์ซ้ำกัน
  result = result.replace(/([\u0E30-\u0E3A\u0E47])\1+/g, "$1");

  // 6. บีบอัดตัวอักษรที่พิมพ์ลากยาวซ้ำเกิน 2 ตัว เช่น "ควยยยยย" -> "ควย"
  result = result.replace(/(.)\1{2,}/g, "$1");

  // 7. สร้างแบบข้อความบีบอัด (Collapsed Text) โดยลบเครื่องหมายวรรคตอนและวรรคทั้งหมด
  // เพื่อตรวจจับการเลี่ยงคำแบบ "ค ว ย", "ค_ว_ย", "ค.ว.ย", "ค*ว*ย"
  const collapsed = result
    .replace(/[\s\.\-_\*\/\\|~+=,;:!?"'()[\]{}<>@#%^&`]+/g, "")
    .toLowerCase();

  return {
    cleanText: result.toLowerCase(),
    collapsedText: collapsed,
  };
}

/**
 * สแกนข้อความเพื่อหาคำหยาบหรือคำต้องห้าม
 */
export function scanProfanity(text: string | null | undefined): ModerationResult {
  if (!text || typeof text !== "string") {
    return { isClean: true, flaggedWords: [] };
  }

  const { cleanText, collapsedText } = normalizeProfanityText(text);

  if (!cleanText && !collapsedText) {
    return { isClean: true, flaggedWords: [] };
  }

  const flagged = new Set<string>();

  for (const badWord of THAI_BAD_WORDS) {
    const targetWord = badWord.toLowerCase().trim();
    if (!targetWord) continue;

    // ตรวจสอบทั้งข้อความที่มีการทำความสะอาดแล้ว และแบบบีบอัดช่องว่าง/สัญลักษณ์
    if (cleanText.includes(targetWord) || collapsedText.includes(targetWord)) {
      flagged.add(badWord);
    }
  }

  const flaggedArray = Array.from(flagged);

  return {
    isClean: flaggedArray.length === 0,
    flaggedWords: flaggedArray,
  };
}

/**
 * ตรวจสอบความถูกต้องของ Note ก่อนอนุญาตให้ทำการแชร์ (ทั้ง Title และ Content)
 */
export function validateNoteForShare(
  title: string | null | undefined,
  content?: string | null | undefined
): ShareValidationResult {
  const titleScan = scanProfanity(title);
  const contentScan = scanProfanity(content);

  const allFlagged = Array.from(
    new Set([...titleScan.flaggedWords, ...contentScan.flaggedWords])
  );

  if (allFlagged.length > 0) {
    return {
      isClean: false,
      flaggedWords: allFlagged,
      errorMessage: `ไม่สามารถแชร์บันทึกนี้ได้ เนื่องจากมีคำไม่เหมาะสมหรือคำต้องห้าม (${allFlagged.slice(0, 5).join(", ")}${allFlagged.length > 5 ? " และอื่นๆ" : ""}) กรุณาแก้ไขเนื้อหาก่อนทำการแชร์สู่สาธารณะ`,
    };
  }

  return {
    isClean: true,
    flaggedWords: [],
  };
}

/**
 * ตรวจสอบความถูกต้องของ Category ก่อนแชร์ (ทั้ง Name, Description และ Notes ภายใน)
 */
export function validateCategoryForShare(
  name: string | null | undefined,
  description?: string | null | undefined,
  childNotes?: Array<{ title: string; content?: string | null }>
): ShareValidationResult {
  const nameScan = scanProfanity(name);
  const descScan = scanProfanity(description);

  const flaggedWords = new Set<string>([
    ...nameScan.flaggedWords,
    ...descScan.flaggedWords,
  ]);

  let offendingNoteTitle: string | null = null;

  if (childNotes && childNotes.length > 0) {
    for (const note of childNotes) {
      const noteCheck = validateNoteForShare(note.title, note.content);
      if (!noteCheck.isClean) {
        noteCheck.flaggedWords.forEach((w) => flaggedWords.add(w));
        if (!offendingNoteTitle) {
          offendingNoteTitle = note.title;
        }
      }
    }
  }

  const flaggedArray = Array.from(flaggedWords);

  if (flaggedArray.length > 0) {
    const detail = offendingNoteTitle
      ? `(พบในโน้ต: "${offendingNoteTitle}" - คำที่พบ: ${flaggedArray.slice(0, 3).join(", ")})`
      : `(${flaggedArray.slice(0, 5).join(", ")})`;

    return {
      isClean: false,
      flaggedWords: flaggedArray,
      errorMessage: `ไม่สามารถแชร์หมวดหมู่นี้ได้ เนื่องจากพบคำไม่เหมาะสมหรือคำต้องห้าม ${detail} กรุณาแก้ไขข้อมูลก่อนแชร์สู่สาธารณะ`,
    };
  }

  return {
    isClean: true,
    flaggedWords: [],
  };
}

import Notes from "../notes";

export const metadata = {
  title: "Notes | ปัวเอนเจ PUANJ",
  description: "ระบบบันทึกข้อมูลใช้งานส่วนตัว",
  keywords: "Note บันทึกข้อมูล",
  openGraph: {
    title: "Notes | ปัวเอนเจ PUANJ",
    description: "ระบบบันทึกข้อมูลใช้งานส่วนตัว",
    url: "https://puanj.com/notes/normal",
    siteName: "Notes | ปัวเอนเจ PUANJ",
    images: [
      {
        url: "",
        width: 1200,
        height: 630,
        alt: "รูปปก",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  alternates: {
    canonical: "https://puanj.com/notes/normal",
  },
};

export default function NormalNotesPage() {
  return <Notes noteType="normal" />;
}
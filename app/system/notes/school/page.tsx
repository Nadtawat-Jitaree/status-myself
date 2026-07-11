import Notes from "../notes";

export const metadata = {
  title: "School Notes | ปัวเอนเจ PUANJ",
  description: "ระบบบันทึกการเรียนมหาวิทยาลัย",
};

export default function SchoolNotesPage() {
  return <Notes noteType="school" />;
}
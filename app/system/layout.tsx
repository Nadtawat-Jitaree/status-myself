import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center w-full bg-slate-50/30">
      <div className="flex-1 w-full flex flex-col items-center gap-10">
        <Navbar />
        <div className="w-full flex-1 px-4 sm:px-6 lg:px-10">{children}</div>
      </div>
      <Footer variant="system" />
    </main>
  );
}

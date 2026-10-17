"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-8 rounded-xl px-3 text-xs flex items-center gap-1.5 shrink-0"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-emerald-600 font-medium">คัดลอกแล้ว</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-slate-500" />
          <span>คัดลอกเนื้อหา</span>
        </>
      )}
    </Button>
  );
}

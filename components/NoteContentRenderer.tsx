"use client";

import React from "react";
import { Check, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteContentRendererProps {
  content?: string | null;
  className?: string;
  isCompact?: boolean;
  readOnly?: boolean;
  emptyText?: string;
  onToggleChecklist?: (lineIndex: number, newChecked: boolean) => void;
}

/**
 * Parses inline markdown:
 * - [Link Title](https://...)
 * - Raw URLs (https://...)
 * - Bold: **text** or __text__
 * - Strikethrough: ~~text~~
 * - Inline code: `text`
 * - Italic: *text*
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Split by supported inline syntax tokens (including style spans, images, links)
  const tokenRegex =
    /(<span[^>]*style="[^"]*"[^>]*>[\s\S]*?<\/span>|!\[(?:[^\]]*)\]\((?:https?:\/\/[^\s)]+)\)|\[(?:[^\]]+)\]\((?:https?:\/\/[^\s)]+)\)|https?:\/\/[^\s]+|\*\*(?:[^*]+?)\*\*|__(?:[^_]+?)__|~~(?:[^~]+?)~~|`[^`]+`|\*(?:[^*]+?)\*)/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // 0. Span with style (e.g. font-size, color, background-color)
    const spanMatch = part.match(/^<span[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/span>$/i);
    if (spanMatch) {
      const styleString = spanMatch[1];
      const innerContent = spanMatch[2];
      // If innerContent has no visible text and no image, do not render an empty phantom span
      const hasContent = innerContent.replace(/<[^>]+>/g, "").trim().length > 0 || /<img\b/i.test(innerContent);
      if (!hasContent) {
        return null;
      }
      const styleObj: Record<string, string> = {};
      styleString.split(";").forEach((pair) => {
        const [k, v] = pair.split(":");
        if (k && v) {
          const camel = k.trim().replace(/-([a-z])/g, (_, g) => g.toUpperCase());
          styleObj[camel] = v.trim();
        }
      });
      return (
        <span key={index} style={styleObj as React.CSSProperties}>
          {renderInline(innerContent)}
        </span>
      );
    }

    // 0.1 Image inline: ![alt](url)
    const imgMatch = part.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
    if (imgMatch) {
      return (
        <span key={index} className="inline-block my-1 max-w-full">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || "รูปภาพประกอบ"}
            className="rounded-md max-h-[180px] w-auto max-w-full object-contain border border-border/50 shadow-xs inline-block"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </span>
      );
    }

    // 1. Markdown Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 dark:text-sky-400 underline hover:opacity-80 inline-flex items-center gap-0.5 break-all font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {linkMatch[1]}
        </a>
      );
    }

    // 2. Raw URL: https://...
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 dark:text-sky-400 underline hover:opacity-80 break-all font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    // 3. Bold: **text** or __text__
    if (
      (part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
      (part.startsWith("__") && part.endsWith("__") && part.length >= 4)
    ) {
      const inner = part.slice(2, -2);
      return (
        <strong
          key={index}
          className="font-bold text-foreground inline"
        >
          {renderInline(inner)}
        </strong>
      );
    }

    // 4. Strikethrough: ~~text~~
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <del key={index} className="line-through opacity-75 inline">
          {renderInline(inner)}
        </del>
      );
    }

    // 5. Inline code: `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-foreground border border-border/50 inline"
        >
          {inner}
        </code>
      );
    }

    // 6. Italic: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic inline">
          {renderInline(inner)}
        </em>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function NoteContentRendererComponent({
  content,
  className,
  isCompact = false,
  readOnly = false,
  emptyText = "ไม่มีรายละเอียดเนื้อหา",
  onToggleChecklist,
}: NoteContentRendererProps) {
  // Clean empty spans and excessive blank lines before rendering
  const cleanedContent = (content || "")
    .replace(/<span[^>]*>\s*<\/span>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // If this note is an annotated PDF notebook, render a friendly badge instead of raw JSON
  if (cleanedContent.startsWith('{"type":"pdf_notes_annotation"')) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 py-0.5", className)}>
        <PenTool className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-medium">สมุดจด PDF (มีลายมือและภาพวาด)</span>
      </div>
    );
  }

  if (!cleanedContent) {
    return (
      <p className={cn("text-muted-foreground/70 italic text-sm", className)}>
        {emptyText}
      </p>
    );
  }

  const lines = cleanedContent.split("\n");

  return (
    <div className={cn("note-content space-y-1", className)}>
      {lines.map((line, lineIndex) => {
        // 1. Checklist item:
        // Matches:
        // - [ ] task
        // - [x] task / - [X] task
        // * [ ] task
        // [ ] task / [x] task
        const checklistMatch = line.match(
          /^(\s*(?:[-*]\s*)?\[)([ xX])\]\s*(.*)$/,
        );

        if (checklistMatch) {
          const isChecked = checklistMatch[2].toLowerCase() === "x";
          const taskText = checklistMatch[3];
          const canToggle = !readOnly && typeof onToggleChecklist === "function";

          return (
            <div
              key={lineIndex}
              className={cn(
                "flex items-start gap-2.5 transition-colors group/item",
                isCompact ? "my-0.5" : "my-1.5",
              )}
            >
              <button
                type="button"
                disabled={!canToggle}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canToggle) {
                    onToggleChecklist(lineIndex, !isChecked);
                  }
                }}
                className={cn(
                  "rounded-md flex items-center justify-center shrink-0 border transition-all select-none",
                  isCompact ? "w-3.5 h-3.5 mt-0.5" : "w-4 h-4 mt-1",
                  isChecked
                    ? "bg-primary border-primary text-primary-foreground shadow-xs"
                    : "border-slate-300 dark:border-slate-600 bg-background hover:border-primary",
                  canToggle
                    ? "cursor-pointer hover:scale-105 active:scale-95"
                    : "cursor-default",
                )}
                aria-label={isChecked ? "ทำเสร็จแล้ว" : "ยังไม่เสร็จ"}
              >
                {isChecked && (
                  <Check
                    className={cn(
                      "stroke-[3]",
                      isCompact ? "w-2.5 h-2.5" : "w-3 h-3",
                    )}
                  />
                )}
              </button>

              <span
                className={cn(
                  "flex-1 leading-relaxed break-words select-text",
                  isCompact ? "text-sm" : "text-base",
                  isChecked &&
                    "line-through text-muted-foreground/70 dark:text-muted-foreground/60",
                )}
              >
                {renderInline(taskText)}
              </span>
            </div>
          );
        }

        // 2. Heading 1: # Heading
        const h1Match = line.match(/^#\s+(.*)$/);
        if (h1Match) {
          return (
            <h1
              key={lineIndex}
              className={cn(
                "font-bold text-foreground border-b border-border/40 pb-1",
                isCompact ? "text-base mt-2 mb-1" : "text-xl md:text-2xl mt-4 mb-2",
              )}
            >
              {renderInline(h1Match[1])}
            </h1>
          );
        }

        // 3. Heading 2: ## Heading
        const h2Match = line.match(/^##\s+(.*)$/);
        if (h2Match) {
          return (
            <h2
              key={lineIndex}
              className={cn(
                "font-bold text-foreground",
                isCompact ? "text-sm mt-1.5 mb-0.5" : "text-lg md:text-xl mt-3 mb-1.5",
              )}
            >
              {renderInline(h2Match[1])}
            </h2>
          );
        }

        // 4. Heading 3: ### Heading
        const h3Match = line.match(/^###\s+(.*)$/);
        if (h3Match) {
          return (
            <h3
              key={lineIndex}
              className={cn(
                "font-semibold text-foreground",
                isCompact ? "text-sm mt-1 mb-0.5" : "text-base md:text-lg mt-2 mb-1",
              )}
            >
              {renderInline(h3Match[1])}
            </h3>
          );
        }

        // 5. Bullet list item: - item, * item, • item (excluding checklist which was matched above)
        const bulletMatch = line.match(/^(\s*)(?:[-*•])\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div
              key={lineIndex}
              className={cn(
                "flex items-start gap-2 pl-2",
                isCompact ? "my-0.5" : "my-1",
              )}
            >
              <span
                className={cn(
                  "rounded-full bg-primary/80 shrink-0",
                  isCompact ? "w-1.5 h-1.5 mt-1.5" : "w-1.5 h-1.5 mt-2",
                )}
              />
              <span
                className={cn(
                  "flex-1 leading-relaxed break-words",
                  isCompact ? "text-sm" : "text-base",
                )}
              >
                {renderInline(bulletMatch[2])}
              </span>
            </div>
          );
        }

        // 6. Numbered list item: 1. item
        const numberedMatch = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div
              key={lineIndex}
              className={cn(
                "flex items-start gap-2 pl-2",
                isCompact ? "my-0.5" : "my-1",
              )}
            >
              <span
                className={cn(
                  "font-semibold text-muted-foreground shrink-0 select-none",
                  isCompact ? "text-xs mt-0.5 min-w-[1rem]" : "text-sm mt-0.5 min-w-[1.2rem]",
                )}
              >
                {numberedMatch[2]}.
              </span>
              <span
                className={cn(
                  "flex-1 leading-relaxed break-words",
                  isCompact ? "text-sm" : "text-base",
                )}
              >
                {renderInline(numberedMatch[3])}
              </span>
            </div>
          );
        }

        // 7. Blockquote: > text
        const quoteMatch = line.match(/^>\s*(.*)$/);
        if (quoteMatch) {
          return (
            <blockquote
              key={lineIndex}
              className={cn(
                "border-l-4 border-primary/60 bg-muted/30 pl-3 py-1 my-1.5 rounded-r text-muted-foreground italic",
                isCompact ? "text-xs my-1" : "text-sm my-2",
              )}
            >
              {renderInline(quoteMatch[1])}
            </blockquote>
          );
        }

        // 8. Divider / Horizontal Rule: --- or *** or ___
        if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
          return (
            <hr
              key={lineIndex}
              className={cn(
                "border-t border-border/70 my-2",
                isCompact ? "my-1.5" : "my-3",
              )}
            />
          );
        }

        // 9. Empty line (blank line or line containing only empty spans/tags)
        const lineVisibleText = line.replace(/<[^>]+>/g, "").trim();
        if (!lineVisibleText && !/<img\b/i.test(line)) {
          return <div key={lineIndex} className={isCompact ? "h-1" : "h-2.5"} />;
        }

        // 10. Normal text paragraph line
        return (
          <p
            key={lineIndex}
            className={cn(
              "leading-relaxed break-words text-foreground/90",
              isCompact ? "text-sm my-0.5" : "text-base my-1",
            )}
          >
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

const NoteContentRenderer = React.memo(NoteContentRendererComponent);
export default NoteContentRenderer;

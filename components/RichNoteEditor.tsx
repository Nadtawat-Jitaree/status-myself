"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import {
  CheckSquare,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading,
  Quote,
  Minus,
  Image as ImageIcon,
  Palette,
  Highlighter,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/**
 * Converts Markdown string to HTML for the contenteditable area
 */
function markdownToHtml(md: string): string {
  if (!md) return "";

  // Strip empty spans from incoming content to prevent empty phantom tags
  let sanitized = md.replace(/<span[^>]*>\s*<\/span>/gi, "").trim();
  if (!sanitized) return "";

  // If it already looks like full HTML document structure with our custom checklist or tags, return sanitized
  if (/<(div|p|h[1-6]|ul|ol|blockquote|hr)\b[^>]*>/i.test(sanitized)) {
    return sanitized;
  }

  const lines = sanitized.split("\n");
  const htmlParts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Checklist item: - [ ] text or - [x] text
    const checkMatch = line.match(/^(\s*(?:[-*]\s*)?\[)([ xX])\]\s*(.*)$/);
    if (checkMatch) {
      const isChecked = checkMatch[2].toLowerCase() === "x";
      const text = parseInlineMdToHtml(checkMatch[3]);
      htmlParts.push(
        `<div class="note-check-item flex items-start gap-2 my-1" data-checked="${isChecked}">` +
          `<input type="checkbox" ${isChecked ? "checked" : ""} class="note-checkbox mt-1 w-4 h-4 rounded accent-primary cursor-pointer shrink-0" />` +
          `<span class="note-check-text flex-1 leading-relaxed ${isChecked ? "line-through opacity-70" : ""}">${text || "<br>"}</span>` +
        `</div>`,
      );
      continue;
    }

    // Heading: ###, ##, #
    const h3Match = line.match(/^###\s+(.*)$/);
    if (h3Match) {
      htmlParts.push(
        `<h3 class="text-base font-bold my-1 text-foreground">${parseInlineMdToHtml(h3Match[1]) || "<br>"}</h3>`,
      );
      continue;
    }
    const h2Match = line.match(/^##\s+(.*)$/);
    if (h2Match) {
      htmlParts.push(
        `<h2 class="text-lg font-bold my-1 text-foreground">${parseInlineMdToHtml(h2Match[1]) || "<br>"}</h2>`,
      );
      continue;
    }
    const h1Match = line.match(/^#\s+(.*)$/);
    if (h1Match) {
      htmlParts.push(
        `<h1 class="text-xl font-bold my-1 text-foreground">${parseInlineMdToHtml(h1Match[1]) || "<br>"}</h1>`,
      );
      continue;
    }

    // Blockquote: > text
    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      htmlParts.push(
        `<blockquote class="border-l-4 border-primary/60 bg-muted/30 pl-3 py-1 my-1.5 rounded-r text-muted-foreground italic">${parseInlineMdToHtml(quoteMatch[1]) || "<br>"}</blockquote>`,
      );
      continue;
    }

    // Divider: --- or *** or ___
    if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
      htmlParts.push(`<hr class="border-t border-border/70 my-2" />`);
      continue;
    }

    // Numbered list item: 1. text
    const numMatch = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    if (numMatch) {
      const lis: string[] = [];
      lis.push(`<li>${parseInlineMdToHtml(numMatch[3]) || "<br>"}</li>`);
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextNum = nextLine.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
        if (nextNum) {
          lis.push(`<li>${parseInlineMdToHtml(nextNum[3]) || "<br>"}</li>`);
          i++;
        } else {
          break;
        }
      }
      htmlParts.push(`<ol class="list-decimal pl-5 my-0.5">${lis.join("")}</ol>`);
      continue;
    }

    // Bullet item
    const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.*)$/);
    if (bulletMatch) {
      const lis: string[] = [];
      lis.push(`<li>${parseInlineMdToHtml(bulletMatch[2]) || "<br>"}</li>`);
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextCheck = nextLine.match(/^(\s*(?:[-*]\s*)?\[)([ xX])\]\s*(.*)$/);
        if (nextCheck) break;
        const nextBullet = nextLine.match(/^(\s*)[•\-\*]\s+(.*)$/);
        if (nextBullet) {
          lis.push(`<li>${parseInlineMdToHtml(nextBullet[2]) || "<br>"}</li>`);
          i++;
        } else {
          break;
        }
      }
      htmlParts.push(`<ul class="list-disc pl-5 my-0.5">${lis.join("")}</ul>`);
      continue;
    }

    // Empty line or line containing only empty HTML tags
    const lineVisibleText = line.replace(/<[^>]+>/g, "").trim();
    if (!lineVisibleText && !/<img\b/i.test(line)) {
      htmlParts.push(`<p class="my-0.5"><br></p>`);
      continue;
    }

    // Regular paragraph
    htmlParts.push(`<p class="my-0.5 leading-relaxed">${parseInlineMdToHtml(line)}</p>`);
  }

  return htmlParts.join("");
}

function parseInlineMdToHtml(text: string): string {
  if (!text) return "";
  // Images: ![alt](url)
  let out = text.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    '<img src="$2" alt="$1" class="rounded max-h-56 object-contain border border-border/50 my-1 inline-block" />',
  );
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__(.+?)__/g, "<strong>$1</strong>");
  out = out.replace(/~~(.+?)~~/g, "<del>$1</del>");
  out = out.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
  return out;
}

/**
 * Converts editor HTML back to standardized Markdown string
 */
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  // Pre-clean: strip empty spans or spans with only whitespace/breaks before processing
  const emptySpans = tempDiv.querySelectorAll("span");
  emptySpans.forEach((s) => {
    if (!s.textContent?.trim() && !s.querySelector("img")) {
      s.remove();
    }
  });

  const lines: string[] = [];

  function processNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // Checklist item
    if (el.classList.contains("note-check-item") || el.getAttribute("data-checked") !== null) {
      const checkbox = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      const dataChecked = el.getAttribute("data-checked");
      const isChecked = dataChecked !== null ? dataChecked === "true" : (checkbox ? (checkbox.checked || checkbox.hasAttribute("checked")) : false);
      const textSpan = el.querySelector(".note-check-text") || el;
      const text = processInline(textSpan);
      return `${isChecked ? "- [x]" : "- [ ]"} ${text.trim()}`;
    }

    // Headings
    if (tagName === "h1") return `# ${processInline(el).trim()}`;
    if (tagName === "h2") return `## ${processInline(el).trim()}`;
    if (tagName === "h3") return `### ${processInline(el).trim()}`;

    // Blockquote
    if (tagName === "blockquote") {
      return `> ${processInline(el).trim()}`;
    }

    // Divider
    if (tagName === "hr") {
      return "---";
    }

    // Numbered Lists
    if (tagName === "ol") {
      const items = Array.from(el.querySelectorAll(":scope > li"));
      items.forEach((li, idx) => {
        lines.push(`${idx + 1}. ${processInline(li).trim()}`);
      });
      return undefined;
    }

    // Bullet Lists
    if (tagName === "ul") {
      const items = Array.from(el.querySelectorAll(":scope > li"));
      items.forEach((li) => {
        lines.push(`• ${processInline(li).trim()}`);
      });
      return undefined;
    }
    if (tagName === "li") {
      return `• ${processInline(el).trim()}`;
    }

    // Paragraph or generic block
    if (tagName === "p" || tagName === "div") {
      return processInline(el).trim();
    }

    return processInline(el);
  }

  function processInline(el: Element): string {
    let result = "";
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.textContent || "";
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childEl = child as HTMLElement;
        const tag = childEl.tagName.toLowerCase();

        // Skip input checkbox from inline text
        if (tag === "input" && (childEl as HTMLInputElement).type === "checkbox") {
          return;
        }

        // Image tag -> markdown ![alt](src)
        if (tag === "img") {
          const img = childEl as HTMLImageElement;
          const src = img.getAttribute("src") || "";
          const alt = img.getAttribute("alt") || "";
          if (src) {
            result += `![${alt}](${src})`;
          }
          return;
        }

        // Span with styles: font-size, color, background-color
        if (tag === "span" && childEl.style) {
          const styleRules: string[] = [];
          // Skip redundant font-size:16px (16px is default body size)
          if (childEl.style.fontSize && childEl.style.fontSize !== "16px") {
            styleRules.push(`font-size:${childEl.style.fontSize}`);
          }
          if (childEl.style.color) styleRules.push(`color:${childEl.style.color}`);
          if (childEl.style.backgroundColor) styleRules.push(`background-color:${childEl.style.backgroundColor}`);

          const inner = processInline(childEl);
          // Never output a span if inner content is empty or contains no visible text/image
          const hasVisibleContent = inner.replace(/<[^>]+>/g, "").trim().length > 0 || /<img\b/i.test(inner);
          if (styleRules.length > 0 && hasVisibleContent) {
            result += `<span style="${styleRules.join(";")}">${inner}</span>`;
            return;
          } else {
            result += inner;
            return;
          }
        }

        // Mark tag (highlight)
        if (tag === "mark") {
          const inner = processInline(childEl);
          if (inner && inner.trim()) {
            result += `<span style="background-color:#fef08a">${inner}</span>`;
          }
          return;
        }

        if (tag === "strong" || tag === "b") {
          const inner = processInline(childEl);
          result += inner && inner.trim() ? `**${inner}**` : inner;
        } else if (tag === "em" || tag === "i") {
          const inner = processInline(childEl);
          result += inner && inner.trim() ? `*${inner}*` : inner;
        } else if (tag === "del" || tag === "s" || tag === "strike") {
          const inner = processInline(childEl);
          result += inner && inner.trim() ? `~~${inner}~~` : inner;
        } else if (tag === "br") {
          result += "\n";
        } else {
          result += processInline(childEl);
        }
      }
    });
    return result;
  }

  for (let i = 0; i < tempDiv.childNodes.length; i++) {
    const child = tempDiv.childNodes[i];
    const line = processNode(child);
    if (line !== undefined) {
      lines.push(line);
    }
  }

  let finalMd = lines.join("\n").trim();
  // Strip any empty spans that might remain
  finalMd = finalMd.replace(/<span[^>]*>\s*<\/span>/gi, "");
  // Collapse excessive empty newlines (max 2)
  finalMd = finalMd.replace(/\n{3,}/g, "\n\n");
  return finalMd;
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

function placeCaretAtEnd(el: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  if (!el.textContent || el.textContent.trim().length === 0) {
    range.collapse(true);
  } else {
    range.collapse(false);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

function createChecklistItem(contentHtml: string, isChecked: boolean = false): HTMLElement {
  const checkItem = document.createElement("div");
  checkItem.className = "note-check-item flex items-start gap-2 my-1";
  checkItem.setAttribute("data-checked", isChecked ? "true" : "false");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = isChecked;
  if (isChecked) {
    checkbox.setAttribute("checked", "checked");
  } else {
    checkbox.removeAttribute("checked");
  }
  checkbox.className = "note-checkbox mt-1 w-4 h-4 rounded accent-primary cursor-pointer shrink-0";

  const textSpan = document.createElement("span");
  textSpan.className = `note-check-text flex-1 leading-relaxed ${isChecked ? "line-through opacity-70" : ""}`;
  textSpan.innerHTML = contentHtml.replace(/<input[^>]*>/gi, "").trim() || "<br>";

  checkItem.appendChild(checkbox);
  checkItem.appendChild(textSpan);
  return checkItem;
}

export default function RichNoteEditor({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "เขียนบันทึกของคุณที่นี่...",
}: RichNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastMarkdownRef = useRef<string>(value);
  const [fontSize, setFontSize] = useState<number>(16);

  // Undo / Redo history state
  const historyRef = useRef<string[]>([value || ""]);
  const historyIndexRef = useRef<number>(0);
  const isUndoRedoActionRef = useRef<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Custom Color inputs state
  const [textColorInput, setTextColorInput] = useState<string>("#ef4444");
  const [bgColorInput, setBgColorInput] = useState<string>("#fef08a");

  // Color picker modal state
  const [openPicker, setOpenPicker] = useState<"text" | "bg" | null>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (!openPicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const modal = document.getElementById("color-picker-modal");
      if (modal && !modal.contains(target)) {
        setOpenPicker(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openPicker]);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    strikethrough: false,
    heading: false,
    list: false,
    orderedList: false,
    checklist: false,
    quote: false,
  });

  const updateUndoRedoAvailability = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Sync external value changes into editor without resetting caret while typing
  useEffect(() => {
    if (!editorRef.current) return;
    const currentMd = htmlToMarkdown(editorRef.current.innerHTML);
    if (value !== currentMd && value !== lastMarkdownRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value);
      lastMarkdownRef.current = value;
      if (!isUndoRedoActionRef.current) {
        historyRef.current = [value];
        historyIndexRef.current = 0;
        updateUndoRedoAvailability();
      }
    }
  }, [value, updateUndoRedoAvailability]);

  // Initial load
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = markdownToHtml(value);
      lastMarkdownRef.current = value;
      historyRef.current = [value || ""];
      historyIndexRef.current = 0;
      updateUndoRedoAvailability();
    }
  }, [value, updateUndoRedoAvailability]);

  const triggerChange = useCallback((skipHistory = false) => {
    if (!editorRef.current) return;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    lastMarkdownRef.current = md;

    if (!skipHistory && !isUndoRedoActionRef.current) {
      const currentHist = historyRef.current.slice(0, historyIndexRef.current + 1);
      if (currentHist[currentHist.length - 1] !== md) {
        currentHist.push(md);
        // limit history to 50 steps
        if (currentHist.length > 50) currentHist.shift();
        historyRef.current = currentHist;
        historyIndexRef.current = currentHist.length - 1;
        updateUndoRedoAvailability();
      }
    }

    onChange(md);
  }, [onChange, updateUndoRedoAvailability]);

  // Undo implementation
  const handleUndo = useCallback(() => {
    if (disabled || historyIndexRef.current <= 0) return;
    isUndoRedoActionRef.current = true;
    historyIndexRef.current -= 1;
    const prevMd = historyRef.current[historyIndexRef.current] || "";
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(prevMd);
      lastMarkdownRef.current = prevMd;
      onChange(prevMd);
    }
    updateUndoRedoAvailability();
    setTimeout(() => {
      isUndoRedoActionRef.current = false;
      if (editorRef.current) {
        editorRef.current.focus();
        placeCaretAtEnd(editorRef.current);
      }
    }, 0);
  }, [disabled, onChange, updateUndoRedoAvailability]);

  // Redo implementation
  const handleRedo = useCallback(() => {
    if (disabled || historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoActionRef.current = true;
    historyIndexRef.current += 1;
    const nextMd = historyRef.current[historyIndexRef.current] || "";
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(nextMd);
      lastMarkdownRef.current = nextMd;
      onChange(nextMd);
    }
    updateUndoRedoAvailability();
    setTimeout(() => {
      isUndoRedoActionRef.current = false;
      if (editorRef.current) {
        editorRef.current.focus();
        placeCaretAtEnd(editorRef.current);
      }
    }, 0);
  }, [disabled, onChange, updateUndoRedoAvailability]);

  // Update active formats & font size from selection
  const updateActiveFormats = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!node || !editor.contains(node)) return;

    const el = node as HTMLElement;
    const isBold =
      typeof document !== "undefined" && document.queryCommandState
        ? document.queryCommandState("bold")
        : false;
    const isItalic =
      typeof document !== "undefined" && document.queryCommandState
        ? document.queryCommandState("italic")
        : false;
    const isStrike =
      typeof document !== "undefined" && document.queryCommandState
        ? document.queryCommandState("strikeThrough")
        : false;
    const isHeading = Boolean(el.closest("h1, h2, h3, h4, h5, h6"));
    const isUl = Boolean(el.closest("ul"));
    const isOl = Boolean(el.closest("ol"));
    const isChecklist = Boolean(el.closest(".note-check-item"));
    const isQuote = Boolean(el.closest("blockquote"));

    setActiveFormats({
      bold: isBold,
      italic: isItalic,
      strikethrough: isStrike,
      heading: isHeading,
      list: isUl && !isChecklist,
      orderedList: isOl,
      checklist: isChecklist,
      quote: isQuote,
    });

    const parentSpan = el.closest("span[style*='font-size']");
    if (parentSpan && parentSpan instanceof HTMLElement) {
      const parsed = parseInt(parentSpan.style.fontSize, 10);
      if (parsed && !isNaN(parsed)) {
        setFontSize(parsed);
      }
    } else {
      const computed = window.getComputedStyle(el).fontSize;
      const parsed = parseInt(computed, 10);
      if (parsed && !isNaN(parsed)) {
        setFontSize(parsed);
      }
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;
      if (node && editorRef.current?.contains(node)) {
        updateActiveFormats();
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateActiveFormats]);

  const applyInlineStyle = (styleKey: "color" | "backgroundColor" | "fontSize", styleValue: string) => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    // Helper to unwrap span if it has no styles left
    const cleanupSpan = (s: HTMLElement) => {
      if (!s.getAttribute("style") || !s.style.cssText.trim()) {
        s.replaceWith(...Array.from(s.childNodes));
      }
    };

    // 1. Collapsed selection (Caret only, no text highlighted)
    if (range.collapsed) {
      let node: Node | null = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      const existingSpan = (node as HTMLElement)?.closest("span[style]");

      if (existingSpan && existingSpan instanceof HTMLElement && editor.contains(existingSpan)) {
        if (styleKey === "fontSize" && styleValue === "16px") {
          existingSpan.style.removeProperty("font-size");
          cleanupSpan(existingSpan);
        } else {
          (existingSpan.style as any)[styleKey] = styleValue;
        }
        triggerChange();
        return;
      }

      // If caret is inside a block with text, style the current block so user doesn't have to manually highlight
      const currentBlock = (node as HTMLElement)?.closest("p, h1, h2, h3, h4, h5, h6, blockquote, li, .note-check-text");
      if (currentBlock && editor.contains(currentBlock) && currentBlock.textContent?.trim()) {
        if (currentBlock.children.length === 1 && currentBlock.firstElementChild?.tagName === "SPAN") {
          const s = currentBlock.firstElementChild as HTMLElement;
          if (styleKey === "fontSize" && styleValue === "16px") {
            s.style.removeProperty("font-size");
            cleanupSpan(s);
          } else {
            (s.style as any)[styleKey] = styleValue;
          }
        } else {
          const cssProp = styleKey === "fontSize" ? "font-size" : styleKey === "backgroundColor" ? "background-color" : "color";
          const innerSpans = currentBlock.querySelectorAll(`span[style*='${cssProp}']`);
          innerSpans.forEach((s) => {
            (s as HTMLElement).style.removeProperty(cssProp);
            cleanupSpan(s as HTMLElement);
          });

          if (!(styleKey === "fontSize" && styleValue === "16px")) {
            const span = document.createElement("span");
            (span.style as any)[styleKey] = styleValue;
            while (currentBlock.firstChild) {
              span.appendChild(currentBlock.firstChild);
            }
            currentBlock.appendChild(span);
          }
        }
        triggerChange();
        return;
      }

      // Empty block: don't insert empty spans
      return;
    }

    // 2. Active selection (!range.collapsed)
    const cloned = range.cloneContents();
    const containsBlocks = cloned.querySelector("p, div, h1, h2, h3, h4, h5, h6, li, blockquote") !== null;

    if (containsBlocks) {
      // MULTI-BLOCK SELECTION ("คลุมทั้งหมด" / Select All)
      const allBlocks = Array.from(
        editor.querySelectorAll("p, h1, h2, h3, h4, h5, h6, blockquote, li, .note-check-text")
      );
      const selectedBlocks = allBlocks.filter((b) => selection.containsNode(b, true));

      const cssProp = styleKey === "fontSize" ? "font-size" : styleKey === "backgroundColor" ? "background-color" : "color";

      selectedBlocks.forEach((block) => {
        // If block is empty, strip any ghost spans inside it
        if (!block.textContent?.trim() && !block.querySelector("img")) {
          const emptySpans = block.querySelectorAll("span");
          emptySpans.forEach((s) => s.remove());
          if (!block.innerHTML.trim()) block.innerHTML = "<br>";
          return;
        }

        // Reverting to default 16px font-size
        if (styleKey === "fontSize" && styleValue === "16px") {
          const innerSpans = block.querySelectorAll("span[style*='font-size']");
          innerSpans.forEach((s) => {
            (s as HTMLElement).style.removeProperty("font-size");
            cleanupSpan(s as HTMLElement);
          });
          if (block.children.length === 1 && block.firstElementChild?.tagName === "SPAN") {
            const s = block.firstElementChild as HTMLElement;
            s.style.removeProperty("font-size");
            cleanupSpan(s);
          }
          return;
        }

        // Block already has a single top-level span wrapper
        if (block.children.length === 1 && block.firstElementChild?.tagName === "SPAN") {
          const s = block.firstElementChild as HTMLElement;
          (s.style as any)[styleKey] = styleValue;
        } else {
          // Remove existing nested conflicting styles
          const innerSpans = block.querySelectorAll(`span[style*='${cssProp}']`);
          innerSpans.forEach((s) => {
            (s as HTMLElement).style.removeProperty(cssProp);
            cleanupSpan(s as HTMLElement);
          });

          const span = document.createElement("span");
          (span.style as any)[styleKey] = styleValue;
          while (block.firstChild) {
            span.appendChild(block.firstChild);
          }
          block.appendChild(span);
        }
      });

      // Keep selection across blocks
      if (selectedBlocks.length > 0) {
        try {
          const newRange = document.createRange();
          newRange.setStartBefore(selectedBlocks[0]);
          newRange.setEndAfter(selectedBlocks[selectedBlocks.length - 1]);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } catch {
          // ignore selection errors
        }
      }
    } else {
      // SINGLE-BLOCK INLINE SELECTION
      let commonParent: Node | null = range.commonAncestorContainer;
      if (commonParent.nodeType === Node.TEXT_NODE) commonParent = commonParent.parentNode;
      const parentSpan = (commonParent as HTMLElement)?.closest("span[style]");

      if (
        parentSpan &&
        parentSpan instanceof HTMLElement &&
        editor.contains(parentSpan) &&
        parentSpan.textContent?.trim() === range.toString().trim()
      ) {
        if (styleKey === "fontSize" && styleValue === "16px") {
          parentSpan.style.removeProperty("font-size");
          cleanupSpan(parentSpan);
        } else {
          (parentSpan.style as any)[styleKey] = styleValue;
        }
      } else {
        if (styleKey === "fontSize" && styleValue === "16px") {
          if (parentSpan && parentSpan instanceof HTMLElement && editor.contains(parentSpan)) {
            parentSpan.style.removeProperty("font-size");
            cleanupSpan(parentSpan);
          }
        } else {
          const span = document.createElement("span");
          (span.style as any)[styleKey] = styleValue;
          try {
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);

            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch (err) {
            console.error("Apply inline style failed:", err);
          }
        }
      }
    }

    triggerChange();
  };

  const applyFontSize = (sizePx: number) => {
    applyInlineStyle("fontSize", `${sizePx}px`);
  };

  const handleDecreaseFontSize = () => {
    if (disabled) return;
    const currentIndex = FONT_SIZES.findIndex((s) => s >= fontSize);
    const newIndex = Math.max(0, (currentIndex === -1 ? 2 : currentIndex) - 1);
    const newSize = FONT_SIZES[newIndex];
    setFontSize(newSize);
    applyFontSize(newSize);
  };

  const handleIncreaseFontSize = () => {
    if (disabled) return;
    const currentIndex = FONT_SIZES.findIndex((s) => s >= fontSize);
    const newIndex = Math.min(
      FONT_SIZES.length - 1,
      (currentIndex === -1 ? 2 : currentIndex) + 1,
    );
    const newSize = FONT_SIZES[newIndex];
    setFontSize(newSize);
    applyFontSize(newSize);
  };

  // Toggle Bold
  const handleToggleBold = () => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand("bold", false);
    updateActiveFormats();
    triggerChange();
  };

  // Toggle Italic
  const handleToggleItalic = () => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand("italic", false);
    updateActiveFormats();
    triggerChange();
  };

  // Toggle Strikethrough
  const handleToggleStrikethrough = () => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand("strikeThrough", false);
    updateActiveFormats();
    triggerChange();
  };

  // Toggle Ordered List (1. 2. 3.)
  const handleToggleOrderedList = () => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!editor.contains(node)) return;

    // Check if inside ol > li
    const olLi = (node as HTMLElement)?.closest("ol > li") as HTMLElement | null;
    if (olLi && editor.contains(olLi)) {
      // Toggle OFF: convert back to paragraph
      const p = document.createElement("p");
      p.className = "my-0.5 leading-relaxed";
      p.innerHTML = olLi.innerHTML || "<br>";

      const parentList = olLi.parentElement;
      if (parentList) {
        const lis = Array.from(parentList.children);
        const liIndex = lis.indexOf(olLi);
        const afterLis = lis.slice(liIndex + 1);

        olLi.remove();

        if (afterLis.length > 0) {
          const newOl = document.createElement("ol");
          newOl.className = parentList.className;
          afterLis.forEach((item) => newOl.appendChild(item));
          parentList.after(newOl);
          parentList.after(p);
        } else {
          parentList.after(p);
        }

        if (parentList.children.length === 0) {
          parentList.remove();
        }
      } else {
        olLi.replaceWith(p);
      }

      placeCaretAtEnd(p);
      updateActiveFormats();
      triggerChange();
      return;
    }

    // Toggle ON: convert current block into <ol><li>...</li></ol>
    let block: HTMLElement | null = node as HTMLElement;
    const checkItem = block.closest(".note-check-item") as HTMLElement | null;
    const heading = block.closest("h1, h2, h3, h4, h5, h6") as HTMLElement | null;
    const ulLi = block.closest("ul > li") as HTMLElement | null;

    const newLi = document.createElement("li");

    if (ulLi && editor.contains(ulLi)) {
      newLi.innerHTML = ulLi.innerHTML || "<br>";
      const parentUl = ulLi.parentElement;
      const ol = document.createElement("ol");
      ol.className = "list-decimal pl-5 my-0.5";
      ol.appendChild(newLi);
      if (parentUl && parentUl.children.length === 1) {
        parentUl.replaceWith(ol);
      } else if (parentUl) {
        ulLi.remove();
        parentUl.after(ol);
      }
    } else if (checkItem && editor.contains(checkItem)) {
      const textSpan = checkItem.querySelector(".note-check-text") || checkItem;
      newLi.innerHTML = textSpan.innerHTML.replace(/<input[^>]*>/gi, "").trim() || "<br>";
      const ol = document.createElement("ol");
      ol.className = "list-decimal pl-5 my-0.5";
      ol.appendChild(newLi);
      checkItem.replaceWith(ol);
    } else if (heading && editor.contains(heading)) {
      newLi.innerHTML = heading.innerHTML || "<br>";
      const ol = document.createElement("ol");
      ol.className = "list-decimal pl-5 my-0.5";
      ol.appendChild(newLi);
      heading.replaceWith(ol);
    } else {
      while (block && block.parentElement && block.parentElement !== editor) {
        block = block.parentElement;
      }
      if (block && editor.contains(block)) {
        newLi.innerHTML = block.innerHTML || "<br>";
        const ol = document.createElement("ol");
        ol.className = "list-decimal pl-5 my-0.5";
        ol.appendChild(newLi);
        block.replaceWith(ol);
      } else {
        newLi.innerHTML = "<br>";
        const ol = document.createElement("ol");
        ol.className = "list-decimal pl-5 my-0.5";
        ol.appendChild(newLi);
        editor.appendChild(ol);
      }
    }

    placeCaretAtEnd(newLi);
    updateActiveFormats();
    triggerChange();
  };

  // Toggle Blockquote
  const handleToggleQuote = () => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!editor.contains(node)) return;

    const quote = (node as HTMLElement)?.closest("blockquote") as HTMLElement | null;
    if (quote && editor.contains(quote)) {
      // Toggle OFF: convert back to paragraph
      const p = document.createElement("p");
      p.className = "my-0.5 leading-relaxed";
      p.innerHTML = quote.innerHTML || "<br>";
      quote.replaceWith(p);
      placeCaretAtEnd(p);
      updateActiveFormats();
      triggerChange();
      return;
    }

    // Toggle ON: convert block to blockquote
    let block: HTMLElement | null = node as HTMLElement;
    while (block && block.parentElement && block.parentElement !== editor) {
      block = block.parentElement;
    }

    const bq = document.createElement("blockquote");
    bq.className = "border-l-4 border-primary/60 bg-muted/30 pl-3 py-1 my-1.5 rounded-r text-muted-foreground italic";

    if (block && editor.contains(block)) {
      bq.innerHTML = block.innerHTML || "<br>";
      block.replaceWith(bq);
    } else {
      bq.innerHTML = "<br>";
      editor.appendChild(bq);
    }

    placeCaretAtEnd(bq);
    updateActiveFormats();
    triggerChange();
  };

  // Insert Horizontal Rule / Divider
  const handleInsertDivider = () => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const hr = document.createElement("hr");
    hr.className = "border-t border-border/70 my-2";
    const p = document.createElement("p");
    p.className = "my-0.5 leading-relaxed";
    p.innerHTML = "<br>";

    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    let block: HTMLElement | null = node as HTMLElement;
    while (block && block.parentElement && block.parentElement !== editor) {
      block = block.parentElement;
    }

    if (block && editor.contains(block)) {
      block.after(p);
      block.after(hr);
    } else {
      editor.appendChild(hr);
      editor.appendChild(p);
    }

    placeCaretAtEnd(p);
    updateActiveFormats();
    triggerChange();
  };

  // Insert Inline Image via URL prompt
  const handleInsertImage = () => {
    if (disabled) return;
    const url = window.prompt("กรุณาวาง URL ของรูปภาพ (เช่น https://example.com/image.png):");
    if (!url || !url.trim()) return;

    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const img = document.createElement("img");
    img.src = url.trim();
    img.alt = "รูปภาพประกอบ";
    img.className = "rounded max-h-56 object-contain border border-border/50 my-1 inline-block";

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);

      const p = document.createElement("p");
      p.className = "my-0.5 leading-relaxed";
      p.innerHTML = "<br>";
      img.after(p);
      placeCaretAtEnd(p);
    } else {
      editor.appendChild(img);
    }

    updateActiveFormats();
    triggerChange();
  };

  // Toggle Bullet List
  const handleToggleList = () => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!editor.contains(node)) return;

    // Check if currently inside a list item
    const li = (node as HTMLElement)?.closest("li") as HTMLElement | null;
    if (li && editor.contains(li)) {
      // Toggle OFF: convert list item back to normal paragraph
      const p = document.createElement("p");
      p.className = "my-0.5 leading-relaxed";
      p.innerHTML = li.innerHTML || "<br>";

      const parentList = li.parentElement;
      if (parentList) {
        const lis = Array.from(parentList.children);
        const liIndex = lis.indexOf(li);
        const afterLis = lis.slice(liIndex + 1);

        li.remove();

        if (afterLis.length > 0) {
          const newUl = document.createElement(parentList.tagName.toLowerCase());
          newUl.className = parentList.className;
          afterLis.forEach((item) => newUl.appendChild(item));
          parentList.after(newUl);
          parentList.after(p);
        } else {
          parentList.after(p);
        }

        if (parentList.children.length === 0) {
          parentList.remove();
        }
      } else {
        li.replaceWith(p);
      }

      placeCaretAtEnd(p);
      updateActiveFormats();
      triggerChange();
      return;
    }

    // Toggle ON: convert current block into <ul><li>...</li></ul>
    let block: HTMLElement | null = node as HTMLElement;
    const checkItem = block.closest(".note-check-item") as HTMLElement | null;
    const heading = block.closest("h1, h2, h3, h4, h5, h6") as HTMLElement | null;

    const newLi = document.createElement("li");

    if (checkItem && editor.contains(checkItem)) {
      const textSpan = checkItem.querySelector(".note-check-text") || checkItem;
      newLi.innerHTML = textSpan.innerHTML.replace(/<input[^>]*>/gi, "").trim() || "<br>";
      const ul = document.createElement("ul");
      ul.className = "list-disc pl-5 my-0.5";
      ul.appendChild(newLi);
      checkItem.replaceWith(ul);
    } else if (heading && editor.contains(heading)) {
      newLi.innerHTML = heading.innerHTML || "<br>";
      const ul = document.createElement("ul");
      ul.className = "list-disc pl-5 my-0.5";
      ul.appendChild(newLi);
      heading.replaceWith(ul);
    } else {
      while (block && block.parentElement && block.parentElement !== editor) {
        block = block.parentElement;
      }

      if (block && editor.contains(block)) {
        newLi.innerHTML = block.innerHTML || "<br>";

        // Try merging with adjacent ul
        const prevSibling = block.previousElementSibling;
        const nextSibling = block.nextElementSibling;
        const isPrevUl = prevSibling && prevSibling.tagName.toLowerCase() === "ul";
        const isNextUl = nextSibling && nextSibling.tagName.toLowerCase() === "ul";

        if (isPrevUl) {
          prevSibling.appendChild(newLi);
          block.remove();
          if (isNextUl) {
            Array.from(nextSibling.children).forEach((child) => prevSibling.appendChild(child));
            nextSibling.remove();
          }
        } else if (isNextUl) {
          nextSibling.prepend(newLi);
          block.remove();
        } else {
          const ul = document.createElement("ul");
          ul.className = "list-disc pl-5 my-0.5";
          ul.appendChild(newLi);
          block.replaceWith(ul);
        }
      } else {
        newLi.innerHTML = "<br>";
        const ul = document.createElement("ul");
        ul.className = "list-disc pl-5 my-0.5";
        ul.appendChild(newLi);
        editor.appendChild(ul);
      }
    }

    placeCaretAtEnd(newLi);
    updateActiveFormats();
    triggerChange();
  };

  // Toggle Heading (H3 <-> Paragraph)
  const handleToggleHeading = () => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!editor.contains(node)) return;

    // Check if inside any heading
    const heading = (node as HTMLElement)?.closest("h1, h2, h3, h4, h5, h6") as HTMLElement | null;
    if (heading && editor.contains(heading)) {
      // Toggle OFF: convert heading back to normal paragraph
      const p = document.createElement("p");
      p.className = "my-0.5 leading-relaxed";
      p.innerHTML = heading.innerHTML || "<br>";
      heading.replaceWith(p);
      placeCaretAtEnd(p);
      updateActiveFormats();
      triggerChange();
      return;
    }

    // Toggle ON: convert current block into H3
    let block: HTMLElement | null = node as HTMLElement;
    const li = block.closest("li");
    const checkItem = block.closest(".note-check-item") as HTMLElement | null;

    const h3 = document.createElement("h3");
    h3.className = "text-base font-bold my-1 text-foreground";

    if (li && editor.contains(li)) {
      h3.innerHTML = li.innerHTML || "<br>";
      const parentList = li.parentElement;
      if (parentList) {
        const lis = Array.from(parentList.children);
        const liIndex = lis.indexOf(li);
        const afterLis = lis.slice(liIndex + 1);
        li.remove();
        if (afterLis.length > 0) {
          const newUl = document.createElement(parentList.tagName.toLowerCase());
          newUl.className = parentList.className;
          afterLis.forEach((item) => newUl.appendChild(item));
          parentList.after(newUl);
          parentList.after(h3);
        } else {
          parentList.after(h3);
        }
        if (parentList.children.length === 0) {
          parentList.remove();
        }
      } else {
        li.replaceWith(h3);
      }
    } else if (checkItem && editor.contains(checkItem)) {
      const textSpan = checkItem.querySelector(".note-check-text") || checkItem;
      h3.innerHTML = textSpan.innerHTML.replace(/<input[^>]*>/gi, "").trim() || "<br>";
      checkItem.replaceWith(h3);
    } else {
      while (block && block.parentElement && block.parentElement !== editor) {
        block = block.parentElement;
      }
      if (block && editor.contains(block)) {
        h3.innerHTML = block.innerHTML || "<br>";
        block.replaceWith(h3);
      } else {
        h3.innerHTML = "<br>";
        editor.appendChild(h3);
      }
    }

    placeCaretAtEnd(h3);
    updateActiveFormats();
    triggerChange();
  };

  // Toggle Checklist
  const handleToggleChecklist = () => {
    if (disabled) return;
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!editor.contains(node)) return;

    const checkItem = (node as HTMLElement)?.closest(".note-check-item") as HTMLElement | null;

    if (checkItem && editor.contains(checkItem)) {
      // Toggle OFF: convert checklist item back to normal paragraph
      const textSpan = checkItem.querySelector(".note-check-text") || checkItem;
      const textHtml = textSpan.innerHTML.replace(/<input[^>]*>/gi, "").trim() || "<br>";
      const p = document.createElement("p");
      p.className = "my-0.5 leading-relaxed";
      p.innerHTML = textHtml;
      checkItem.replaceWith(p);
      placeCaretAtEnd(p);
    } else {
      // Toggle ON: convert current block (or li, or heading, or p) to checklist item
      let block: HTMLElement | null = node as HTMLElement;
      const li = block.closest("li");
      const heading = block.closest("h1, h2, h3, h4, h5, h6");

      let contentHtml = "<br>";

      if (li && editor.contains(li)) {
        contentHtml = li.innerHTML || "<br>";
        const parentList = li.parentElement;
        const checkEl = createChecklistItem(contentHtml);

        if (parentList) {
          const lis = Array.from(parentList.children);
          const liIndex = lis.indexOf(li);
          const afterLis = lis.slice(liIndex + 1);
          li.remove();

          if (afterLis.length > 0) {
            const newUl = document.createElement(parentList.tagName.toLowerCase());
            newUl.className = parentList.className;
            afterLis.forEach((item) => newUl.appendChild(item));
            parentList.after(newUl);
            parentList.after(checkEl);
          } else {
            parentList.after(checkEl);
          }
          if (parentList.children.length === 0) {
            parentList.remove();
          }
        } else {
          li.replaceWith(checkEl);
        }

        const textSpan = checkEl.querySelector(".note-check-text") as HTMLElement | null;
        placeCaretAtEnd(textSpan || checkEl);
      } else if (heading && editor.contains(heading)) {
        contentHtml = heading.innerHTML || "<br>";
        const checkEl = createChecklistItem(contentHtml);
        heading.replaceWith(checkEl);
        const textSpan = checkEl.querySelector(".note-check-text") as HTMLElement | null;
        placeCaretAtEnd(textSpan || checkEl);
      } else {
        while (block && block.parentElement && block.parentElement !== editor) {
          block = block.parentElement;
        }
        const targetBlock = block && editor.contains(block) ? block : null;
        contentHtml = targetBlock ? targetBlock.innerHTML || "<br>" : "<br>";
        const checkEl = createChecklistItem(contentHtml);
        if (targetBlock) {
          targetBlock.replaceWith(checkEl);
        } else {
          editor.appendChild(checkEl);
        }
        const textSpan = checkEl.querySelector(".note-check-text") as HTMLElement | null;
        placeCaretAtEnd(textSpan || checkEl);
      }
    }

    updateActiveFormats();
    triggerChange();
  };

  // Handle clicking checkbox directly inside the editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
      const input = target as HTMLInputElement;
      const checkItem = input.closest(".note-check-item") as HTMLElement | null;
      if (checkItem) {
        checkItem.setAttribute("data-checked", input.checked ? "true" : "false");
        if (input.checked) {
          input.setAttribute("checked", "checked");
        } else {
          input.removeAttribute("checked");
        }
        const textSpan = checkItem.querySelector(".note-check-text");
        if (textSpan) {
          if (input.checked) {
            textSpan.classList.add("line-through", "opacity-70");
          } else {
            textSpan.classList.remove("line-through", "opacity-70");
          }
        }
        updateActiveFormats();
        triggerChange();
      }
    }
  };

  // Keyboard navigation & Enter key handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl+Z for Undo / Ctrl+Shift+Z (or Ctrl+Y) for Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Ctrl+B for bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      handleToggleBold();
      return;
    }

    // Enter key
    if (e.key === "Enter" && !e.shiftKey) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      if (!editorRef.current?.contains(node)) return;

      // 1. Enter in Checklist item
      const checkItem = (node as HTMLElement)?.closest(".note-check-item") as HTMLElement | null;
      if (checkItem && editorRef.current.contains(checkItem)) {
        e.preventDefault();
        const textSpan = checkItem.querySelector(".note-check-text");
        const textContent = textSpan?.textContent?.trim() || "";

        // If checklist item is empty, pressing Enter turns it into a normal paragraph
        if (!textContent) {
          const p = document.createElement("p");
          p.className = "my-0.5 leading-relaxed";
          p.innerHTML = "<br>";
          checkItem.replaceWith(p);
          placeCaretAtEnd(p);
          updateActiveFormats();
          triggerChange();
          return;
        }

        // Has text: insert new checklist item below
        const newItem = createChecklistItem("<br>", false);
        checkItem.after(newItem);
        const newText = newItem.querySelector(".note-check-text") as HTMLElement | null;
        placeCaretAtEnd(newText || newItem);
        updateActiveFormats();
        triggerChange();
        return;
      }

      // 2. Enter in List item (li)
      const li = (node as HTMLElement)?.closest("li") as HTMLElement | null;
      if (li && editorRef.current.contains(li)) {
        const textContent = li.textContent?.trim() || "";

        // If list item is empty, pressing Enter exits the list into a normal paragraph
        if (!textContent) {
          e.preventDefault();
          const parentList = li.parentElement;
          const p = document.createElement("p");
          p.className = "my-0.5 leading-relaxed";
          p.innerHTML = "<br>";

          if (parentList) {
            parentList.after(p);
            li.remove();
            if (parentList.children.length === 0) {
              parentList.remove();
            }
          } else {
            li.replaceWith(p);
          }

          placeCaretAtEnd(p);
          updateActiveFormats();
          triggerChange();
          return;
        }

        // If list item has text, create a new li below
        e.preventDefault();
        const newLi = document.createElement("li");
        newLi.innerHTML = "<br>";
        li.after(newLi);
        placeCaretAtEnd(newLi);
        updateActiveFormats();
        triggerChange();
        return;
      }

      // 3. Enter in Heading
      const heading = (node as HTMLElement)?.closest("h1, h2, h3, h4, h5, h6") as HTMLElement | null;
      if (heading && editorRef.current.contains(heading)) {
        if (!heading.textContent?.trim()) {
          // Empty heading turns into paragraph
          e.preventDefault();
          const p = document.createElement("p");
          p.className = "my-0.5 leading-relaxed";
          p.innerHTML = "<br>";
          heading.replaceWith(p);
          placeCaretAtEnd(p);
          updateActiveFormats();
          triggerChange();
          return;
        } else if (range.collapsed) {
          // If caret is at the end of heading, insert paragraph below
          const testRange = range.cloneRange();
          testRange.selectNodeContents(heading);
          testRange.setStart(range.endContainer, range.endOffset);
          if (testRange.toString().length === 0) {
            e.preventDefault();
            const p = document.createElement("p");
            p.className = "my-0.5 leading-relaxed";
            p.innerHTML = "<br>";
            heading.after(p);
            placeCaretAtEnd(p);
            updateActiveFormats();
            triggerChange();
            return;
          }
        }
      }
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground">รายละเอียด (Content)</label>
        <div className="flex flex-wrap items-center gap-1 bg-muted/60 p-1 rounded-lg border text-xs">
          {/* Font Size Controls: A- [16px] A+ */}
          <div className="flex items-center gap-1 pr-1.5 border-r border-border/60">
            <button
              type="button"
              onClick={handleDecreaseFontSize}
              disabled={disabled}
              className="px-1.5 py-0.5 rounded-md hover:bg-background text-foreground font-semibold flex items-center justify-center h-7 min-w-[28px]"
              title="ลดขนาดตัวอักษร (A-)"
            >
              A-
            </button>

            <select
              value={fontSize}
              onChange={(e) => {
                const s = Number(e.target.value);
                if (s) {
                  setFontSize(s);
                  applyFontSize(s);
                }
              }}
              disabled={disabled}
              className="h-7 px-1.5 rounded bg-background border border-input text-foreground text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
              title="เลือกขนาดตัวอักษร"
            >
              {!FONT_SIZES.includes(fontSize) && (
                <option value={fontSize}>{fontSize}px</option>
              )}
              {FONT_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}px
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleIncreaseFontSize}
              disabled={disabled}
              className="px-1.5 py-0.5 rounded-md hover:bg-background text-foreground font-semibold flex items-center justify-center h-7 min-w-[28px]"
              title="เพิ่มขนาดตัวอักษร (A+)"
            >
              A+
            </button>
          </div>

          {/* Undo / Redo Controls */}
          <div className="flex items-center gap-0.5 pr-1 border-r border-border/60">
            <button
              type="button"
              onClick={handleUndo}
              disabled={disabled || !canUndo}
              className={cn(
                "p-1 rounded-md flex items-center justify-center h-7 w-7",
                canUndo && !disabled
                  ? "hover:bg-background text-foreground"
                  : "text-muted-foreground/40 cursor-not-allowed",
              )}
              title="ย้อนกลับ (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={disabled || !canRedo}
              className={cn(
                "p-1 rounded-md flex items-center justify-center h-7 w-7",
                canRedo && !disabled
                  ? "hover:bg-background text-foreground"
                  : "text-muted-foreground/40 cursor-not-allowed",
              )}
              title="ยกเลิกการย้อนกลับ (Ctrl+Shift+Z หรือ Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color & Highlight Pickers */}
          <div className="flex items-center gap-1 px-1 border-r border-border/60">
            {/* Text Color Button */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpenPicker(openPicker === "text" ? null : "text")}
              className={cn(
                "px-1.5 py-1 rounded-md flex items-center gap-0.5 text-foreground h-7",
                openPicker === "text" ? "bg-background border border-border/80 shadow-xs" : "hover:bg-background"
              )}
              title="เปลี่ยนสีข้อความ"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="text-[10px] opacity-70">▼</span>
            </button>

            {/* Highlight Background Color Button */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setOpenPicker(openPicker === "bg" ? null : "bg")}
              className={cn(
                "px-1.5 py-1 rounded-md flex items-center gap-0.5 text-foreground h-7",
                openPicker === "bg" ? "bg-background border border-border/80 shadow-xs" : "hover:bg-background"
              )}
              title="ไฮไลท์สีพื้นหลัง"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] opacity-70">▼</span>
            </button>
          </div>

          {/* Color Picker Modal (fixed center) */}
          {openPicker && (
            <div
              id="color-picker-modal"
              className="fixed inset-0 z-[999] flex items-center justify-center pointer-events-none"
            >
              <div
                className="pointer-events-auto bg-popover border border-border rounded-2xl shadow-2xl p-4 w-[min(92vw,280px)] flex flex-col gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {openPicker === "text" ? "🎨 สีตัวอักษร" : "🖌️ สีไฮไลท์พื้นหลัง"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenPicker(null)}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>

                {/* Circle Color Wheel — 12 preset dots arranged like a clock */}
                {(() => {
                  const textColors = [
                    { label: "แดง", color: "#ef4444" },
                    { label: "ส้มแดง", color: "#f97316" },
                    { label: "ส้ม", color: "#fb923c" },
                    { label: "เหลือง", color: "#eab308" },
                    { label: "เขียวอ่อน", color: "#84cc16" },
                    { label: "เขียว", color: "#10b981" },
                    { label: "ฟ้าอ่อน", color: "#06b6d4" },
                    { label: "น้ำเงิน", color: "#3b82f6" },
                    { label: "น้ำเงินเข้ม", color: "#6366f1" },
                    { label: "ม่วง", color: "#8b5cf6" },
                    { label: "ชมพู", color: "#ec4899" },
                    { label: "ชมพูเข้ม", color: "#db2777" },
                  ];
                  const bgColors = [
                    { label: "เหลืองอ่อน", color: "#fef08a" },
                    { label: "แดงอ่อน", color: "#fecaca" },
                    { label: "ส้มอ่อน", color: "#fed7aa" },
                    { label: "เหลืองทอง", color: "#fde68a" },
                    { label: "เขียวมิ้นต์", color: "#d1fae5" },
                    { label: "เขียวอ่อน", color: "#bbf7d0" },
                    { label: "ฟ้าอ่อน", color: "#bae6fd" },
                    { label: "น้ำเงินอ่อน", color: "#bfdbfe" },
                    { label: "คราม", color: "#c7d2fe" },
                    { label: "ม่วงอ่อน", color: "#e9d5ff" },
                    { label: "ชมพูอ่อน", color: "#fbcfe8" },
                    { label: "เทาอ่อน", color: "#e2e8f0" },
                  ];
                  const colors = openPicker === "text" ? textColors : bgColors;
                  const R = 80; // radius of circle in px
                  const DOT = 24; // dot size in px
                  const size = R * 2 + DOT + 8;
                  const cx = size / 2;
                  const cy = size / 2;
                  return (
                    <div className="flex flex-col items-center gap-2">
                      {/* Circular arrangement */}
                      <div className="relative" style={{ width: size, height: size }}>
                        {/* Center: reset button */}
                        <button
                          type="button"
                          onClick={() => {
                            openPicker === "text"
                              ? applyInlineStyle("color", "")
                              : applyInlineStyle("backgroundColor", "");
                            setOpenPicker(null);
                          }}
                          className="absolute rounded-full border-2 border-dashed border-border/70 flex items-center justify-center text-muted-foreground hover:bg-muted text-xs font-bold transition-all hover:scale-110"
                          style={{
                            width: DOT + 8,
                            height: DOT + 8,
                            left: cx - (DOT + 8) / 2,
                            top: cy - (DOT + 8) / 2,
                          }}
                          title="ลบสี / คืนค่าเดิม"
                        >
                          ×
                        </button>
                        {/* 12 color dots around the circle */}
                        {colors.map((item, i) => {
                          const angle = (i * 360) / colors.length - 90; // start from top (12 o'clock)
                          const rad = (angle * Math.PI) / 180;
                          const x = cx + R * Math.cos(rad) - DOT / 2;
                          const y = cy + R * Math.sin(rad) - DOT / 2;
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                openPicker === "text"
                                  ? applyInlineStyle("color", item.color)
                                  : applyInlineStyle("backgroundColor", item.color);
                                if (openPicker === "text") setTextColorInput(item.color);
                                else setBgColorInput(item.color);
                                setOpenPicker(null);
                              }}
                              className="absolute rounded-full border-2 border-white/80 shadow-md hover:scale-125 active:scale-95 transition-transform"
                              style={{
                                width: DOT,
                                height: DOT,
                                left: x,
                                top: y,
                                backgroundColor: item.color,
                              }}
                              title={item.label}
                            />
                          );
                        })}
                      </div>

                      {/* Custom hex input + color swatch */}
                      <div className="flex items-center gap-1.5 w-full pt-1 border-t border-border/60">
                        <input
                          type="color"
                          value={openPicker === "text" ? textColorInput : bgColorInput}
                          onChange={(e) => {
                            if (openPicker === "text") {
                              setTextColorInput(e.target.value);
                              applyInlineStyle("color", e.target.value);
                            } else {
                              setBgColorInput(e.target.value);
                              applyInlineStyle("backgroundColor", e.target.value);
                            }
                          }}
                          className="w-8 h-8 p-0.5 rounded-lg border border-border cursor-pointer bg-transparent shrink-0"
                          title="เลือกสีแบบ picker"
                        />
                        <input
                          type="text"
                          value={openPicker === "text" ? textColorInput : bgColorInput}
                          placeholder="#000000"
                          onChange={(e) => {
                            if (openPicker === "text") setTextColorInput(e.target.value);
                            else setBgColorInput(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = openPicker === "text" ? textColorInput : bgColorInput;
                              openPicker === "text"
                                ? applyInlineStyle("color", val)
                                : applyInlineStyle("backgroundColor", val);
                              setOpenPicker(null);
                            }
                          }}
                          className="h-8 px-2 flex-1 rounded-lg bg-background border border-input text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
                          title="ใส่รหัสสี เช่น #ef4444"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = openPicker === "text" ? textColorInput : bgColorInput;
                            openPicker === "text"
                              ? applyInlineStyle("color", val)
                              : applyInlineStyle("backgroundColor", val);
                            setOpenPicker(null);
                          }}
                          className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 shrink-0"
                        >
                          ใช้
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleChecklist}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md flex items-center gap-1 h-7",
              activeFormats.checklist
                ? "bg-background text-primary shadow-xs border border-border/80 font-medium"
                : "hover:bg-background text-foreground",
            )}
            title="สลับ Checklist"
          >
            <CheckSquare className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Checklist</span>
          </button>
          <button
            type="button"
            onClick={handleToggleBold}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md flex items-center gap-1 font-bold h-7",
              activeFormats.bold
                ? "bg-background text-primary shadow-xs border border-border/80"
                : "hover:bg-background text-foreground",
            )}
            title="สลับตัวหนา (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleItalic}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md flex items-center gap-1 italic h-7",
              activeFormats.italic
                ? "bg-background text-primary shadow-xs border border-border/80"
                : "hover:bg-background text-foreground",
            )}
            title="สลับตัวเอียง (Italic)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleStrikethrough}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md flex items-center gap-1 line-through h-7",
              activeFormats.strikethrough
                ? "bg-background text-primary shadow-xs border border-border/80"
                : "hover:bg-background text-foreground",
            )}
            title="สลับขีดทับ (Strikethrough)"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleList}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md flex items-center gap-1 h-7",
              activeFormats.list
                ? "bg-background text-primary shadow-xs border border-border/80 font-medium"
                : "hover:bg-background text-foreground",
            )}
            title="สลับรายการข้อย่อย (Bullet)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleOrderedList}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md flex items-center gap-1 h-7",
              activeFormats.orderedList
                ? "bg-background text-primary shadow-xs border border-border/80 font-medium"
                : "hover:bg-background text-foreground",
            )}
            title="สลับรายการตัวเลข (Numbered List)"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleHeading}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md flex items-center gap-1 h-7",
              activeFormats.heading
                ? "bg-background text-primary shadow-xs border border-border/80 font-medium"
                : "hover:bg-background text-foreground",
            )}
            title="สลับหัวข้อ (Heading)"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleQuote}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md flex items-center gap-1 h-7",
              activeFormats.quote
                ? "bg-background text-primary shadow-xs border border-border/80 font-medium"
                : "hover:bg-background text-foreground",
            )}
            title="สลับข้อความอ้างอิง (Blockquote)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleInsertDivider}
            disabled={disabled}
            className="px-2 py-1 rounded-md hover:bg-background flex items-center gap-1 text-foreground h-7"
            title="แทรกเส้นคั่น (Divider)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleInsertImage}
            disabled={disabled}
            className="px-2 py-1 rounded-md hover:bg-background flex items-center gap-1 text-foreground h-7"
            title="แทรกรูปภาพจาก URL (Image)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={() => {
          updateActiveFormats();
          triggerChange();
        }}
        onClick={handleEditorClick}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={cn(
          "rich-note-editor min-h-[160px] max-h-[360px] overflow-y-auto w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none",
        )}
      />
    </div>
  );
}

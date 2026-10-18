"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { CheckSquare, Bold, List, Heading } from "lucide-react";
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

  // If it already looks like HTML with our custom checklist or tags, return directly
  if (/<(div|p|h[1-6]|ul|ol|strong|b|em|i)\b[^>]*>/i.test(md)) {
    return md;
  }

  const lines = md.split("\n");
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

    // Empty line
    if (!line.trim()) {
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
  let out = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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
      const isChecked = checkbox ? checkbox.checked : el.getAttribute("data-checked") === "true";
      const textSpan = el.querySelector(".note-check-text") || el;
      const text = processInline(textSpan);
      return `${isChecked ? "- [x]" : "- [ ]"} ${text.trim()}`;
    }

    // Headings
    if (tagName === "h1") return `# ${processInline(el).trim()}`;
    if (tagName === "h2") return `## ${processInline(el).trim()}`;
    if (tagName === "h3") return `### ${processInline(el).trim()}`;

    // Lists
    if (tagName === "ul" || tagName === "ol") {
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

        if (tag === "span" && childEl.style && childEl.style.fontSize) {
          const size = childEl.style.fontSize;
          const inner = processInline(childEl);
          result += `<span style="font-size:${size}">${inner}</span>`;
          return;
        }

        if (tag === "strong" || tag === "b") {
          const inner = processInline(childEl);
          result += inner ? `**${inner}**` : "";
        } else if (tag === "em" || tag === "i") {
          const inner = processInline(childEl);
          result += inner ? `*${inner}*` : "";
        } else if (tag === "del" || tag === "s") {
          const inner = processInline(childEl);
          result += inner ? `~~${inner}~~` : "";
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

  return lines.join("\n").trim();
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
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    heading: false,
    list: false,
    checklist: false,
  });

  // Sync external value changes into editor without resetting caret while typing
  useEffect(() => {
    if (!editorRef.current) return;
    const currentMd = htmlToMarkdown(editorRef.current.innerHTML);
    if (value !== currentMd && value !== lastMarkdownRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value);
      lastMarkdownRef.current = value;
    }
  }, [value]);

  // Initial load
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = markdownToHtml(value);
      lastMarkdownRef.current = value;
    }
  }, []);

  const triggerChange = useCallback(() => {
    if (!editorRef.current) return;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    lastMarkdownRef.current = md;
    onChange(md);
  }, [onChange]);

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
    const isHeading = Boolean(el.closest("h1, h2, h3, h4, h5, h6"));
    const isList = Boolean(el.closest("li, ul, ol"));
    const isChecklist = Boolean(el.closest(".note-check-item"));

    setActiveFormats({
      bold: isBold,
      heading: isHeading,
      list: isList,
      checklist: isChecklist,
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

  const applyFontSize = (sizePx: number) => {
    if (disabled) return;
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      let node: Node | null = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
      const existingSpan = (node as HTMLElement)?.closest("span[style*='font-size']");
      if (existingSpan && existingSpan instanceof HTMLElement) {
        existingSpan.style.fontSize = `${sizePx}px`;
        triggerChange();
      } else {
        const block = (node as HTMLElement)?.closest("p, div, li, h1, h2, h3");
        if (block && block instanceof HTMLElement && block !== editorRef.current) {
          block.style.fontSize = `${sizePx}px`;
          triggerChange();
        }
      }
      return;
    }

    let commonParent: Node | null = range.commonAncestorContainer;
    if (commonParent.nodeType === Node.TEXT_NODE) commonParent = commonParent.parentNode;
    const parentSpan = (commonParent as HTMLElement)?.closest("span[style*='font-size']");

    if (
      parentSpan &&
      parentSpan instanceof HTMLElement &&
      parentSpan.textContent?.trim() === range.toString().trim()
    ) {
      parentSpan.style.fontSize = `${sizePx}px`;
    } else {
      const span = document.createElement("span");
      span.style.fontSize = `${sizePx}px`;
      try {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);

        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (err) {
        console.error("Apply font size failed:", err);
      }
    }

    triggerChange();
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

  // Toggle Bold (Native execCommand handles toggle on/off automatically)
  const handleToggleBold = () => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand("bold", false);
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
              className="px-1.5 py-0.5 rounded hover:bg-background transition text-foreground font-semibold flex items-center justify-center h-7 min-w-[28px]"
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
              className="px-1.5 py-0.5 rounded hover:bg-background transition text-foreground font-semibold flex items-center justify-center h-7 min-w-[28px]"
              title="เพิ่มขนาดตัวอักษร (A+)"
            >
              A+
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleChecklist}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded transition flex items-center gap-1 h-7",
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
              "px-2 py-1 rounded transition flex items-center gap-1 font-bold h-7",
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
            onClick={handleToggleList}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded transition flex items-center gap-1 h-7",
              activeFormats.list
                ? "bg-background text-primary shadow-xs border border-border/80 font-medium"
                : "hover:bg-background text-foreground",
            )}
            title="สลับรายการข้อย่อย"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleToggleHeading}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded transition flex items-center gap-1 h-7",
              activeFormats.heading
                ? "bg-background text-primary shadow-xs border border-border/80 font-medium"
                : "hover:bg-background text-foreground",
            )}
            title="สลับหัวข้อ"
          >
            <Heading className="w-3.5 h-3.5" />
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

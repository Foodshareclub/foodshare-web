"use client";

/**
 * RichTextEditor - Beautiful TipTap-based HTML editor
 * Features: formatting toolbar, link insertion, image support, code blocks
 */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Code2,
  Minus,
  Eye,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing your email...",
  className,
  minHeight = "300px",
}: RichTextEditorProps) {
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Track if update came from external prop change to avoid infinite loops
  const isExternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg max-w-full h-auto" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      // Don't trigger onChange if this update was from external prop
      if (!isExternalUpdate.current) {
        onChange(editor.getHTML());
      }
      isExternalUpdate.current = false;
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none",
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-p:text-foreground prose-p:leading-relaxed",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
          "prose-pre:bg-muted prose-pre:rounded-lg"
        ),
      },
    },
  });

  // Sync external value changes with the editor
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      isExternalUpdate.current = true;
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const chain = () => editor?.chain().focus() as any;

  const addLink = () => {
    if (linkUrl && editor) {
      chain().extendMarkRange("link").setLink({ href: linkUrl }).run();
      setLinkUrl("");
    }
  };

  const addImage = () => {
    if (imageUrl && editor) {
      chain().setImage({ src: imageUrl }).run();
      setImageUrl("");
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-white/20 bg-white/10 dark:bg-black/10 overflow-hidden",
        "backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
        "transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "hover:shadow-[0_12px_48px_rgba(0,0,0,0.12)] hover:border-white/30",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-white/10 bg-white/5 dark:bg-black/5 backdrop-blur-md">
        {/* Text Formatting */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => chain().toggleBold().run()}
            isActive={editor.isActive("bold")}
            tooltip="Bold (⌘B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            tooltip="Italic (⌘I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().toggleStrike().run()}
            isActive={editor.isActive("strike")}
            tooltip="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().toggleCode().run()}
            isActive={editor.isActive("code")}
            tooltip="Inline Code"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => chain().setParagraph().run()}
            isActive={editor.isActive("paragraph")}
            tooltip="Paragraph"
          >
            <Pilcrow className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            tooltip="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            tooltip="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            tooltip="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists & Blocks */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => chain().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            tooltip="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            tooltip="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().toggleBlockquote().run()}
            isActive={editor.isActive("blockquote")}
            tooltip="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            tooltip="Code Block"
          >
            <Code2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => chain().setHorizontalRule().run()}
            tooltip="Horizontal Rule"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Links & Images */}
        <ToolbarGroup>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", editor.isActive("link") && "bg-muted text-primary")}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-3">
                <p className="text-sm font-medium">Insert Link</p>
                <Input
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLink()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={addLink} className="flex-1">
                    Add Link
                  </Button>
                  {editor.isActive("link") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editor.chain().focus().unsetLink().run()}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-3">
                <p className="text-sm font-medium">Insert Image</p>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addImage()}
                />
                <Button size="sm" onClick={addImage} className="w-full">
                  Add Image
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </ToolbarGroup>

        <div className="flex-1" />

        {/* Undo/Redo & View Toggle */}
        <ToolbarGroup>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            tooltip="Undo (⌘Z)"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            tooltip="Redo (⌘⇧Z)"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarGroup>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "visual" | "html")}>
          <TabsList className="h-8 p-0.5 bg-muted/50">
            <TabsTrigger value="visual" className="h-7 px-2 text-xs gap-1">
              <Eye className="h-3.5 w-3.5" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="html" className="h-7 px-2 text-xs gap-1">
              <FileCode className="h-3.5 w-3.5" />
              HTML
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Editor Content */}
      <div style={{ minHeight }}>
        {viewMode === "visual" ? (
          <EditorContent
            editor={editor}
            className="p-4 min-h-[inherit] [&_.ProseMirror]:min-h-[inherit] [&_.ProseMirror]:outline-none"
          />
        ) : (
          <textarea
            value={editor.getHTML()}
            onChange={(e) => {
              editor.commands.setContent(e.target.value);
              onChange(e.target.value);
            }}
            className={cn(
              "w-full p-4 font-mono text-sm bg-transparent resize-none focus:outline-none",
              "text-foreground placeholder:text-muted-foreground"
            )}
            style={{ minHeight }}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}

// Toolbar Components
function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

interface ToolbarButtonProps {
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip?: string;
  size?: "sm" | "default";
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  size = "default",
  children,
}: ToolbarButtonProps) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        size === "sm" ? "h-7 w-7 p-0" : "h-8 w-8 p-0",
        "transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "hover:bg-white/10 dark:hover:bg-white/5",
        !disabled && "hover:scale-110 active:scale-95",
        isActive && "bg-white/20 dark:bg-white/10 text-primary shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

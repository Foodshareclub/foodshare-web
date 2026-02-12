"use client";

/**
 * RichTextEditor - Lexical-based rich text editor
 * Replaces TipTap for ~150KB bundle savings
 */

import { useCallback, useEffect, useState } from "react";
import { FeatureErrorBoundary } from "@/components/ErrorBoundary";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  type EditorState,
  type LexicalEditor,
} from "lexical";
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import {
  ListNode,
  ListItemNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { LinkNode, TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link";
import { $setBlocksType } from "@lexical/selection";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Undo,
  Redo,
  Heading2,
  Heading3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type RichTextEditorProps = {
  content?: string;
  placeholder?: string;
  onChange?: (content: string, json: Record<string, unknown>) => void;
  editable?: boolean;
  className?: string;
  minHeight?: string;
};

// Lexical theme for prose styling
const theme = {
  paragraph: "my-2",
  heading: {
    h2: "text-xl font-semibold my-2",
    h3: "text-lg font-semibold my-2",
  },
  list: {
    ul: "list-disc ml-6 my-2",
    ol: "list-decimal ml-6 my-2",
    listitem: "my-1",
  },
  quote: "border-l-4 border-border pl-4 italic my-2 text-muted-foreground",
  text: {
    bold: "font-bold",
    italic: "italic",
    strikethrough: "line-through",
    code: "bg-muted px-1.5 py-0.5 rounded font-mono text-sm",
  },
  link: "text-primary underline",
};

// Initial editor configuration
function createEditorConfig(editable: boolean) {
  return {
    namespace: "ForumEditor",
    theme,
    editable,
    onError: (error: Error) => console.error("[RichTextEditor] Error:", error),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
  };
}

// Toolbar component
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsCode(selection.hasFormat("code"));

      // Check for link
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  // Toolbar button handlers
  const formatBold = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
  const formatItalic = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
  const formatStrikethrough = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
  const formatCode = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
  const undo = () => editor.dispatchCommand(UNDO_COMMAND, undefined);
  const redo = () => editor.dispatchCommand(REDO_COMMAND, undefined);

  const insertHeading = (level: "h2" | "h3") => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(level));
      }
    });
  };

  const insertQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
  };

  const insertBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const insertOrderedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  const insertLink = () => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      const url = window.prompt("Enter URL:");
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    }
  };

  const buttons = [
    { icon: Bold, action: formatBold, active: isBold, title: "Bold" },
    { icon: Italic, action: formatItalic, active: isItalic, title: "Italic" },
    {
      icon: Strikethrough,
      action: formatStrikethrough,
      active: isStrikethrough,
      title: "Strikethrough",
    },
    { icon: Code, action: formatCode, active: isCode, title: "Code" },
    { type: "divider" as const },
    { icon: Heading2, action: () => insertHeading("h2"), active: false, title: "Heading 2" },
    { icon: Heading3, action: () => insertHeading("h3"), active: false, title: "Heading 3" },
    { type: "divider" as const },
    { icon: List, action: insertBulletList, active: false, title: "Bullet List" },
    { icon: ListOrdered, action: insertOrderedList, active: false, title: "Ordered List" },
    { icon: Quote, action: insertQuote, active: false, title: "Quote" },
    { type: "divider" as const },
    { icon: Link2, action: insertLink, active: isLink, title: "Add Link" },
    { type: "divider" as const },
    { icon: Undo, action: undo, active: false, title: "Undo" },
    { icon: Redo, action: redo, active: false, title: "Redo" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30 rounded-t-lg">
      {buttons.map((btn, i) => {
        if ("type" in btn && btn.type === "divider") {
          return <div key={i} className="w-px h-6 bg-border mx-1" />;
        }
        const Icon = btn.icon;
        return (
          <Button
            key={i}
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={btn.action}
            className={cn("h-8 w-8", btn.active && "bg-primary/10 text-primary")}
            title={btn.title}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}

// Plugin to load initial HTML content
function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || !content) return;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(content, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);

      const root = $getRoot();
      root.clear();

      nodes.forEach((node) => {
        root.append(node);
      });
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialization flag, only runs once
    setInitialized(true);
  }, [editor, content, initialized]);

  return null;
}

// Placeholder component
function Placeholder({ text }: { text: string }) {
  return (
    <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none select-none">
      {text}
    </div>
  );
}

export function RichTextEditor({
  content = "",
  placeholder = "Write something...",
  onChange,
  editable = true,
  className,
  minHeight = "150px",
}: RichTextEditorProps) {
  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor, null);
        const json = editorState.toJSON() as unknown as Record<string, unknown>;
        onChange?.(html, json);
      });
    },
    [onChange]
  );

  return (
    <FeatureErrorBoundary featureName="Rich Text Editor">
      <div className={cn("border border-border rounded-lg overflow-hidden bg-background", className)}>
        <LexicalComposer initialConfig={createEditorConfig(editable)}>
          {editable && <ToolbarPlugin />}
          <div className="relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={cn(
                    "prose prose-sm dark:prose-invert max-w-none focus:outline-none p-4",
                    "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-blockquote:my-2",
                    "prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg"
                  )}
                  style={{ minHeight }}
                />
              }
              placeholder={<Placeholder text={placeholder} />}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <OnChangePlugin onChange={handleChange} />
          <InitialContentPlugin content={content} />
        </LexicalComposer>
      </div>
    </FeatureErrorBoundary>
  );
}

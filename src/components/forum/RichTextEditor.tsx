'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaListUl,
  FaListOl,
  FaQuoteLeft,
  FaCode,
  FaLink,
  FaImage,
  FaUndo,
  FaRedo,
} from 'react-icons/fa';

type RichTextEditorProps = {
  content?: string;
  placeholder?: string;
  onChange?: (content: string, json: Record<string, unknown>) => void;
  editable?: boolean;
  className?: string;
  minHeight?: string;
};

function MenuBar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const buttons = [
    { icon: FaBold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Bold' },
    { icon: FaItalic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italic' },
    { icon: FaStrikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), title: 'Strikethrough' },
    { icon: FaCode, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code'), title: 'Code' },
    { type: 'divider' as const },
    { icon: FaListUl, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'Bullet List' },
    { icon: FaListOl, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: 'Ordered List' },
    { icon: FaQuoteLeft, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), title: 'Quote' },
    { type: 'divider' as const },
    { icon: FaLink, action: addLink, active: editor.isActive('link'), title: 'Add Link' },
    { icon: FaImage, action: addImage, active: false, title: 'Add Image' },
    { type: 'divider' as const },
    { icon: FaUndo, action: () => editor.chain().focus().undo().run(), active: false, title: 'Undo', disabled: !editor.can().undo() },
    { icon: FaRedo, action: () => editor.chain().focus().redo().run(), active: false, title: 'Redo', disabled: !editor.can().redo() },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30 rounded-t-lg">
      {buttons.map((btn, i) => {
        if ('type' in btn && btn.type === 'divider') {
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
            disabled={'disabled' in btn ? btn.disabled : false}
            className={cn('h-8 w-8', btn.active && 'bg-primary/10 text-primary')}
            title={btn.title}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}

export function RichTextEditor({
  content = '',
  placeholder = 'Write something...',
  onChange,
  editable = true,
  className,
  minHeight = '150px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML(), editor.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none p-4',
          'prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-blockquote:my-2',
          'prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg'
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden bg-background', className)}>
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

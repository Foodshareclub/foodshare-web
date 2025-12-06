'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';

type RichTextViewerProps = {
  content: string | Record<string, unknown> | null;
  className?: string;
};

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: true, HTMLAttributes: { class: 'text-primary underline', target: '_blank', rel: 'noopener noreferrer' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
    ],
    content: typeof content === 'string' ? content : content ?? '',
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-blockquote:my-2',
          'prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg'
        ),
      },
    },
  });

  if (!content) return null;

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}

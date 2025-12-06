'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ForumCategory, ForumPostType } from '@/api/forumAPI';
import { createClient } from '@/lib/supabase/client';
import { FaPaperPlane, FaImage } from 'react-icons/fa';

type CreatePostFormProps = {
  categories: ForumCategory[];
  userId: string;
};

const POST_TYPES: { value: ForumPostType; label: string }[] = [
  { value: 'discussion', label: 'Discussion' },
  { value: 'question', label: 'Question' },
  { value: 'guide', label: 'Guide' },
];

export function CreatePostForm({ categories, userId }: CreatePostFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [richContent, setRichContent] = useState<Record<string, unknown>>({});
  const [categoryId, setCategoryId] = useState<string>('');
  const [postType, setPostType] = useState<ForumPostType>('discussion');
  const [imageUrl, setImageUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const { data, error: insertError } = await supabase
      .from('forum')
      .insert({
        profile_id: userId,
        forum_post_name: title,
        forum_post_description: content,
        rich_content: richContent,
        category_id: parseInt(categoryId),
        post_type: postType,
        forum_post_image: imageUrl || null,
        slug,
        forum_published: true,
      })
      .select('slug')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push(`/forum/${data.slug}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's on your mind?"
          required
        />
      </div>

      {/* Category & Post Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Post Type</Label>
          <Select value={postType} onValueChange={(v) => setPostType(v as ForumPostType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cover Image */}
      <div className="space-y-2">
        <Label htmlFor="image">Cover Image URL (optional)</Label>
        <div className="flex gap-2">
          <Input
            id="image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
          />
          <Button type="button" variant="outline" size="icon">
            <FaImage className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label>Content *</Label>
        <RichTextEditor
          content={content}
          placeholder="Write your post content here..."
          onChange={(html, json) => {
            setContent(html);
            setRichContent(json);
          }}
          minHeight="250px"
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          <FaPaperPlane className="mr-2 h-4 w-4" />
          {submitting ? 'Publishing...' : 'Publish Post'}
        </Button>
      </div>
    </form>
  );
}

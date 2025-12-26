"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Send, Upload, Loader2, X } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ForumCategory, ForumPostType } from "@/api/forumAPI";
import { createClient } from "@/lib/supabase/client";
import { uploadToStorage } from "@/app/actions/storage";

// Icon aliases for consistency
const FaPaperPlane = Send;

type CreatePostFormProps = {
  categories: ForumCategory[];
  userId: string;
};

const POST_TYPES: { value: ForumPostType; label: string }[] = [
  { value: "discussion", label: "Discussion" },
  { value: "question", label: "Question" },
  { value: "guide", label: "Guide" },
];

export function CreatePostForm({ categories, userId }: CreatePostFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-generate a UUID for the image path (not the post ID which is auto-generated bigint)
  const imagePathId = useMemo(() => crypto.randomUUID(), []);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [richContent, setRichContent] = useState<Record<string, unknown>>({});
  const [categoryId, setCategoryId] = useState<string>("");
  const [postType, setPostType] = useState<ForumPostType>("discussion");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    setError(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Get file extension
      const ext = file.name.split(".").pop() || "jpg";
      formData.append("bucket", "forum");
      formData.append("filePath", `${imagePathId}/cover.${ext}`);

      const result = await uploadToStorage(formData);

      if (result.success && result.publicUrl) {
        setImageUrl(result.publicUrl);
      } else {
        setError(result.error || "Failed to upload image");
        setImagePreview(null);
      }
    } catch {
      setError("Failed to upload image");
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUrl("");
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Generate slug client-side - we know it will be unique due to timestamp
      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now();

      // Insert without .select() for faster response
      const { error: insertError } = await supabase.from("forum").insert({
        profile_id: userId,
        forum_post_name: title,
        forum_post_description: content,
        rich_content: richContent,
        category_id: parseInt(categoryId),
        post_type: postType,
        forum_post_image: imageUrl || null,
        slug,
        forum_published: true,
      });

      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }

      // Navigate using the slug we generated
      router.replace(`/forum/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
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
        <Label>Cover Image (optional)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          id="forum-image-upload"
        />

        {imagePreview || imageUrl ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview || imageUrl}
              alt="Cover preview"
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearImage}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
        ) : (
          <label
            htmlFor="forum-image-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Click to upload cover image</span>
            <span className="text-xs text-muted-foreground mt-1">Max 5MB</span>
          </label>
        )}
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
          {submitting ? "Publishing..." : "Publish Post"}
        </Button>
      </div>
    </form>
  );
}

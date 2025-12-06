import { createCachedClient } from '@/lib/supabase/server';
import { siteConfig } from '@/lib/metadata';

/**
 * RSS Feed for Forum Posts
 * Helps with SEO by providing an RSS feed for search engines and feed readers
 */
export async function GET(): Promise<Response> {
  const supabase = createCachedClient();

  const { data: posts } = await supabase
    .from('forum')
    .select(`
      id,
      slug,
      forum_post_name,
      forum_post_description,
      forum_post_created_at,
      forum_post_image,
      profiles!forum_profile_id_profiles_fkey (nickname, first_name),
      forum_categories!forum_category_id_fkey (name)
    `)
    .eq('forum_published', true)
    .order('forum_post_created_at', { ascending: false })
    .limit(50);

  const feedItems = (posts || [])
    .map((post) => {
      const authorName =
        post.profiles?.nickname || post.profiles?.first_name || 'Community Member';
      const postUrl = `${siteConfig.url}/forum/${post.slug || post.id}`;
      const description = post.forum_post_description
        ? stripHtml(post.forum_post_description).slice(0, 500)
        : '';

      return `
    <item>
      <title><![CDATA[${escapeXml(post.forum_post_name || 'Forum Post')}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${new Date(post.forum_post_created_at).toUTCString()}</pubDate>
      <author>${escapeXml(authorName)}</author>
      ${post.forum_categories ? `<category>${escapeXml(post.forum_categories.name)}</category>` : ''}
      <description><![CDATA[${description}]]></description>
      ${post.forum_post_image ? `<enclosure url="${post.forum_post_image}" type="image/jpeg" />` : ''}
    </item>`;
    })
    .join('');

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${siteConfig.name} Community Forum</title>
    <link>${siteConfig.url}/forum</link>
    <description>Latest discussions from the FoodShare community forum about food sharing, sustainability, and community initiatives.</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteConfig.url}/forum/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${siteConfig.url}/logo512.png</url>
      <title>${siteConfig.name} Community Forum</title>
      <link>${siteConfig.url}/forum</link>
    </image>
    ${feedItems}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

import { ImageResponse } from 'next/og';

export const ogImageSize = { width: 1200, height: 630 };

type OGImageProps = {
  title: string;
  subtitle?: string;
  emoji?: string;
  type?: 'default' | 'food' | 'forum' | 'profile' | 'challenge';
  imageUrl?: string;
};

const gradients = {
  default: 'linear-gradient(135deg, #00A699 0%, #00C9B7 50%, #7DD3C0 100%)',
  food: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 50%, #FFC93C 100%)',
  forum: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  profile: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  challenge: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #f093fb 100%)',
};

const emojis = {
  default: '🥕',
  food: '🍽️',
  forum: '💬',
  profile: '👤',
  challenge: '🏆',
};

/**
 * Generate a dynamic OG image for any page
 * Use in opengraph-image.tsx files:
 * 
 * ```tsx
 * import { generateOGImage, ogImageSize } from '@/lib/og-image';
 * 
 * export const size = ogImageSize;
 * export const contentType = 'image/png';
 * 
 * export default async function Image({ params }) {
 *   const data = await getData(params.id);
 *   return generateOGImage({
 *     title: data.title,
 *     subtitle: data.description,
 *     type: 'food',
 *   });
 * }
 * ```
 */
export function generateOGImage({
  title,
  subtitle,
  emoji,
  type = 'default',
  imageUrl,
}: OGImageProps): ImageResponse {
  const gradient = gradients[type];
  const defaultEmoji = emoji || emojis[type];

  // Truncate title if too long
  const displayTitle = title.length > 50 ? `${title.slice(0, 47)}...` : title;
  const displaySubtitle = subtitle && subtitle.length > 100 
    ? `${subtitle.slice(0, 97)}...` 
    : subtitle;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: gradient,
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Background image overlay if provided */}
        {imageUrl && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.3,
            }}
          />
        )}

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
            padding: '40px 60px',
            textAlign: 'center',
          }}
        >
          {/* Emoji/Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.95)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 60 }}>{defaultEmoji}</span>
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 30 ? 48 : 56,
              fontWeight: 800,
              color: 'white',
              textShadow: '0 4px 12px rgba(0,0,0,0.3)',
              marginBottom: 16,
              maxWidth: '90%',
              lineHeight: 1.2,
            }}
          >
            {displayTitle}
          </div>

          {/* Subtitle */}
          {displaySubtitle && (
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                color: 'rgba(255,255,255,0.9)',
                textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                maxWidth: '80%',
                lineHeight: 1.4,
              }}
            >
              {displaySubtitle}
            </div>
          )}
        </div>

        {/* FoodShare branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'white',
            }}
          >
            <span style={{ fontSize: 24 }}>🥕</span>
          </div>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'white',
              textShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            FoodShare
          </span>
        </div>
      </div>
    ),
    { ...ogImageSize }
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { FiFlag } from 'react-icons/fi';
import Navbar from '@/components/header/navbar/Navbar';
import { Button } from '@/components/ui/button';
import { StarIcon } from '@/utils/icons';
import { ReportPostDialog } from '@/components/reports';
import type { InitialProductStateType } from '@/types/product.types';
import type { AuthUser } from '@/app/actions/auth';
import { isValidImageUrl } from '@/lib/image';

// Dynamically import Leaflet (requires client-side rendering)
const Leaflet = dynamic(() => import('@/components/leaflet/Leaflet'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] md:h-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-4xl">🗺️</span>
    </div>
  ),
});

interface ProductDetailClientProps {
  product: InitialProductStateType | null;
  user: AuthUser | null;
}

/**
 * ProductDetailClient - Client component for product detail page
 * Receives product data from Server Component
 */
export function ProductDetailClient({ product, user }: ProductDetailClientProps) {
  const t = useTranslations();
  const router = useRouter();

  // Auth state from user prop
  const isAuth = !!user;
  const userId = user?.id || '';
  const profile = user?.profile;
  const isOwner = userId === product?.profile_id;
  const productType = product?.post_type || 'food';

  // Rating state for interactive stars
  const [rating, setRating] = useState(0);

  const onStarClick = (index: number) => {
    setRating(index + 1);
  };

  const handleContactSeller = () => {
    if (!isAuth) {
      router.push('/auth/login');
      return;
    }
    router.push(`/chat?food=${product?.id}`);
  };

  const handleEditListing = () => {
    router.push(`/food/${product?.id}/edit`);
  };

  // Empty Navbar handlers (navigation handled internally by Navbar)
  const handleRouteChange = () => {};
  const handleProductTypeChange = () => {};

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background dark:from-background dark:to-muted/20">
        <Navbar
          userId={userId}
          isAuth={isAuth}
          productType="food"
          onRouteChange={handleRouteChange}
          onProductTypeChange={handleProductTypeChange}
          imgUrl={profile?.avatar_url || ''}
          firstName={profile?.first_name || ''}
          secondName={profile?.second_name || ''}
          email={profile?.email || ''}
          signalOfNewMessage={[]}
        />
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">{t('product_not_found')}</h2>
          <button
            onClick={() => router.push('/food')}
            className="mt-6 px-6 py-3 bg-[#FF2D55] hover:bg-[#E6284D] text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            {t('browse_products')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background dark:from-background dark:to-muted/20">
      {/* Navbar */}
      <Navbar
        userId={userId}
        isAuth={isAuth}
        productType={productType}
        onRouteChange={handleRouteChange}
        onProductTypeChange={handleProductTypeChange}
        imgUrl={profile?.avatar_url || ''}
        firstName={profile?.first_name || ''}
        secondName={profile?.second_name || ''}
        email={profile?.email || ''}
        signalOfNewMessage={[]}
      />

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Left Column - Product Detail (Scrollable) */}
        <div className="w-full lg:w-1/2 px-4 pb-12">
          <div className="flex flex-col gap-6">
            <div className="glass w-full overflow-hidden rounded-xl transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-xl">
              {/* Hero Image with Back Button Overlay */}
              <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                {product.images?.[0] && isValidImageUrl(product.images[0]) ? (
                  <Image
                    src={product.images[0]}
                    alt={product.post_name}
                    className="w-full h-full object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                    quality={90}
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-6xl">📦</span>
                  </div>
                )}
                {/* Back Button on Image */}
                <button
                  onClick={() => router.back()}
                  className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-background/90 backdrop-blur-sm rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-all shadow-md"
                >
                  <span>←</span>
                  <span className="text-sm font-medium">{t('back')}</span>
                </button>
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {product.images.length} photos
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Category Badge */}
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium capitalize">
                    {product.post_type}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold mb-3">{product.post_name}</h1>

                {/* Location */}
                <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                  <span className="text-lg">📍</span>
                  <p className="text-base">{product.post_stripped_address}</p>
                </div>

                <hr className="my-4 border-border" />

                {/* Stats Row */}
                <div className="flex justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-lg">❤️</span>
                    <p className="text-sm">{product.post_like_counter || 0} likes</p>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-lg">👁</span>
                    <p className="text-sm">{t('views_count', { count: product.post_views })}</p>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-lg">📅</span>
                    <p className="text-sm">{new Date(product.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Rating */}
                {!isOwner && (
                  <div className="flex justify-center gap-1 mb-4">
                    {Array(5)
                      .fill('')
                      .map((_, i) => (
                        <StarIcon
                          key={i}
                          onClick={() => onStarClick(i)}
                          color={i < rating ? 'teal.500' : 'gray.300'}
                          cursor="pointer"
                        />
                      ))}
                  </div>
                )}

                <hr className="my-4 border-border" />

                {/* Details */}
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-foreground/80">
                      <span className="text-lg">🕐</span>
                      <p className="font-medium">{t('available')}</p>
                    </div>
                    <p className="text-muted-foreground">{product.available_hours}</p>
                  </div>

                  {product.post_description && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-foreground/80 mb-2">
                        <span className="text-lg">📝</span>
                        <p className="font-medium">{t('description')}</p>
                      </div>
                      <p className="text-muted-foreground leading-relaxed pl-7">
                        {product.post_description}
                      </p>
                    </div>
                  )}

                  {product.transportation && (
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-2 text-foreground/80">
                        <span className="text-lg">🚌</span>
                        <p className="font-medium">{t('transport')}</p>
                      </div>
                      <p className="text-muted-foreground uppercase text-sm">{product.transportation}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  {isOwner ? (
                    <>
                      <Button
                        onClick={handleEditListing}
                        className="flex-1 uppercase font-semibold py-3 bg-orange-500 hover:bg-orange-600"
                      >
                        {t('edit_listing')}
                      </Button>
                      <Link href="/user-listings" className="flex-1">
                        <Button
                          variant="glass"
                          className="w-full uppercase font-semibold py-3"
                        >
                          {t('my_listings')}
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleContactSeller}
                        className="flex-1 uppercase font-semibold py-3 bg-orange-500 hover:bg-orange-600"
                      >
                        {isAuth ? t('contact_sharer') : t('login_to_contact')}
                      </Button>
                      {/* Report button - only for logged-in users */}
                      {isAuth && (
                        <ReportPostDialog
                          postId={product.id}
                          postName={product.post_name}
                          trigger={
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                              <FiFlag className="h-5 w-5" />
                            </Button>
                          }
                        />
                      )}
                    </>
                  )}
                </div>

                {/* Status Indicators */}
                {!product.is_active && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-center">
                    <p className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">
                      {t('this_listing_is_no_longer_active')}
                    </p>
                  </div>
                )}

                {product.is_arranged && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center">
                    <p className="text-green-800 dark:text-green-300 text-sm font-medium">
                      {t('this_item_has_been_arranged')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* About This Listing - Mobile Only */}
            <div className="lg:hidden">
              <AboutListingCard product={product} />
            </div>
          </div>
        </div>

        {/* Right Column - Map (Fixed on Desktop) */}
        <div className="w-full lg:w-1/2 h-[400px] lg:h-auto lg:fixed lg:right-0 lg:top-0 lg:bottom-0">
          <Leaflet product={product} />
        </div>
      </div>
    </div>
  );
}

function AboutListingCard({ product }: { product: InitialProductStateType }) {
  const t = useTranslations();

  return (
    <div className="glass rounded-xl p-4">
      <h3 className="text-xl font-semibold text-foreground mb-4">{t('about_this_listing')}</h3>
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-muted-foreground">{t('category')}:</span>{' '}
          <span className="font-medium text-foreground capitalize">{product.post_type}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('posted')}:</span>{' '}
          <span className="font-medium text-foreground">
            {new Date(product.created_at).toLocaleDateString()}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('status')}:</span>{' '}
          <span
            className={`font-medium ${product.is_active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
          >
            {product.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailClient;

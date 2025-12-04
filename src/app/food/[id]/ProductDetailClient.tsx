'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/header/navbar/Navbar';
import { GlassCard, GlassButton } from '@/components/Glass';
import { StarIcon } from '@/utils/icons';
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

  const onStarClick = useCallback((index: number) => {
    setRating(index + 1);
  }, []);

  const handleContactSeller = () => {
    if (!isAuth) {
      router.push('/auth/login');
      return;
    }
    router.push(`/chat?product=${product?.id}`);
  };

  const handleEditListing = () => {
    router.push(`/food/${product?.id}/edit`);
  };

  // Empty Navbar handlers (navigation handled internally by Navbar)
  const handleRouteChange = useCallback(() => {}, []);
  const handleProductTypeChange = useCallback(() => {}, []);

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
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
          <h2 className="text-2xl font-semibold mb-2">{t('product_not_found')}</h2>
          <button
            onClick={() => router.push('/food')}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            {t('browse_products')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
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

      {/* Back Button */}
      <div className="container mx-auto px-4 py-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span>←</span>
          <span>{t('back')}</span>
        </button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column - Product Detail */}
          <div className="flex flex-col gap-6">
            <GlassCard
              variant="standard"
              padding="0"
              className="w-full overflow-hidden transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-xl"
            >
              {/* Hero Image */}
              <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
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
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span className="text-6xl">📦</span>
                  </div>
                )}
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
                <div className="flex items-center gap-2 mb-4 text-gray-600">
                  <span className="text-lg">📍</span>
                  <p className="text-base">{product.post_stripped_address}</p>
                </div>

                <hr className="my-4 border-gray-200" />

                {/* Stats Row */}
                <div className="flex justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-lg">❤️</span>
                    <p className="text-sm">{product.post_like_counter || 0} likes</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-lg">👁</span>
                    <p className="text-sm">{t('views_count', { count: product.post_views })}</p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
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

                <hr className="my-4 border-gray-200" />

                {/* Details */}
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className="text-lg">🕐</span>
                      <p className="font-medium">{t('available')}</p>
                    </div>
                    <p className="text-gray-600">{product.available_hours}</p>
                  </div>

                  {product.post_description && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-gray-700 mb-2">
                        <span className="text-lg">📝</span>
                        <p className="font-medium">{t('description')}</p>
                      </div>
                      <p className="text-gray-600 leading-relaxed pl-7">
                        {product.post_description}
                      </p>
                    </div>
                  )}

                  {product.transportation && (
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="text-lg">🚌</span>
                        <p className="font-medium">{t('transport')}</p>
                      </div>
                      <p className="text-gray-600 uppercase text-sm">{product.transportation}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex gap-3">
                  {isOwner ? (
                    <>
                      <GlassButton
                        variant="accentOrange"
                        onClick={handleEditListing}
                        className="flex-1 uppercase font-semibold py-3"
                      >
                        {t('edit_listing')}
                      </GlassButton>
                      <Link href="/user-listings" className="flex-1">
                        <GlassButton
                          variant="standard"
                          className="w-full uppercase font-semibold py-3"
                        >
                          {t('my_listings')}
                        </GlassButton>
                      </Link>
                    </>
                  ) : (
                    <GlassButton
                      variant="accentOrange"
                      onClick={handleContactSeller}
                      className="w-full uppercase font-semibold py-3"
                    >
                      {isAuth ? t('contact_sharer') : t('login_to_contact')}
                    </GlassButton>
                  )}
                </div>

                {/* Status Indicators */}
                {!product.is_active && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <p className="text-yellow-800 text-sm font-medium">
                      {t('this_listing_is_no_longer_active')}
                    </p>
                  </div>
                )}

                {product.is_arranged && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-green-800 text-sm font-medium">
                      {t('this_item_has_been_arranged')}
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* About This Listing - Mobile */}
            <div className="lg:hidden">
              <AboutListingCard product={product} />
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl overflow-hidden shadow-lg h-[400px] lg:h-[500px] xl:h-[600px]">
              <Leaflet />
            </div>

            {/* About This Listing - Desktop */}
            <div className="hidden lg:block">
              <AboutListingCard product={product} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutListingCard({ product }: { product: InitialProductStateType }) {
  const t = useTranslations();

  return (
    <GlassCard variant="standard" padding="md">
      <h3 className="text-xl font-semibold mb-4">{t('about_this_listing')}</h3>
      <div className="space-y-3 text-sm">
        <div>
          <span className="text-gray-600">{t('category')}:</span>{' '}
          <span className="font-medium capitalize">{product.post_type}</span>
        </div>
        <div>
          <span className="text-gray-600">{t('posted')}:</span>{' '}
          <span className="font-medium">
            {new Date(product.created_at).toLocaleDateString()}
          </span>
        </div>
        <div>
          <span className="text-gray-600">{t('status')}:</span>{' '}
          <span
            className={`font-medium ${product.is_active ? 'text-green-600' : 'text-gray-400'}`}
          >
            {product.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}

export default ProductDetailClient;

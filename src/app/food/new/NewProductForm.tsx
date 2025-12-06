'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCreateProduct } from '@/hooks'
import { useUIStore } from '@/store/zustand/useUIStore'
import { storageAPI } from '@/api/storageAPI'
import Navbar from '@/components/header/navbar/Navbar'
import { useAuth } from '@/hooks/useAuth'
import { useCurrentProfile } from '@/hooks/queries/useProfileQueries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STORAGE_BUCKETS, getStorageUrl } from '@/constants/storage'
import { toGeoJSON } from '@/types/postgis.types'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
const MAX_FILE_SIZE_MB = 10
const MAX_IMAGES = 4

type FormData = {
  post_name: string
  post_description: string
  post_type: string
  available_hours: string
  transportation: string
  post_address: string
  post_stripped_address: string
}

interface NewProductFormProps {
  userId: string
}

export function NewProductForm({ userId }: NewProductFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const { userLocation } = useUIStore()

  // Auth and profile for navbar
  const { isAuthenticated } = useAuth()
  const { profile, avatarUrl } = useCurrentProfile(userId)
  const isAdmin = profile?.role?.admin === true

  // React Query mutation
  const createProduct = useCreateProduct()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const [formData, setFormData] = useState<FormData>({
    post_name: '',
    post_description: '',
    post_type: 'food',
    available_hours: '',
    transportation: 'pickup',
    post_address: '',
    post_stripped_address: '',
  })

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (selectedImages.length + files.length > MAX_IMAGES) {
      setError(`You can only upload up to ${MAX_IMAGES} images`)
      return
    }

    const validFiles: File[] = []
    const newPreviews: string[] = []

    files.forEach((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Please use PNG, JPEG, or WebP.`)
        return
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
        return
      }

      validFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    })

    setSelectedImages((prev) => [...prev, ...validFiles])
    setImagePreviews((prev) => [...prev, ...newPreviews])
  }, [selectedImages])

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      URL.revokeObjectURL(prev[index])
      return updated
    })
  }, [])

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []

    for (const file of selectedImages) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      try {
        await storageAPI.uploadImage({
          bucket: STORAGE_BUCKETS.POSTS,
          filePath: fileName,
          file,
        })

        const publicUrl = getStorageUrl(STORAGE_BUCKETS.POSTS, fileName)
        uploadedUrls.push(publicUrl)
      } catch (err) {
        console.error('Error uploading image:', err)
        throw new Error(`Failed to upload ${file.name}`)
      }
    }

    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.post_name.trim()) {
      setError('Please enter a title')
      return
    }

    if (formData.post_name.trim().length < 3) {
      setError('Title must be at least 3 characters')
      return
    }

    if (!formData.post_description.trim()) {
      setError('Please enter a description')
      return
    }

    if (formData.post_description.trim().length < 20) {
      setError('Description must be at least 20 characters')
      return
    }

    if (selectedImages.length === 0) {
      setError('Please add at least one image')
      return
    }

    if (!formData.available_hours.trim()) {
      setError('Please enter availability hours')
      return
    }

    if (!formData.post_address.trim()) {
      setError('Please enter an address')
      return
    }

    setIsSubmitting(true)

    try {
      const imageUrls = await uploadImages()

      const productData = {
        post_name: formData.post_name.trim(),
        post_description: formData.post_description.trim(),
        post_type: formData.post_type,
        available_hours: formData.available_hours.trim(),
        transportation: formData.transportation,
        post_address: formData.post_address.trim(),
        post_stripped_address: formData.post_stripped_address.trim() || formData.post_address.trim(),
        images: imageUrls,
        profile_id: userId,
        is_active: true,
        is_arranged: false,
        post_like_counter: 0,
        post_views: 0,
        location: userLocation ? toGeoJSON({ lat: userLocation.latitude, lng: userLocation.longitude }) : null,
      }

      await createProduct.mutateAsync(productData)
      router.push(`/food?type=${formData.post_type}`)
    } catch (err) {
      console.error('Error creating product:', err)
      setError('Failed to create listing. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleRouteChange = (route: string) => {
    router.push(`/${route}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background dark:from-background dark:to-muted/20">
      <Navbar
        userId={userId}
        isAuth={isAuthenticated}
        isAdmin={isAdmin}
        productType="food"
        onRouteChange={handleRouteChange}
        onProductTypeChange={() => {}}
        imgUrl={avatarUrl || profile?.avatar_url || ''}
        firstName={profile?.first_name || ''}
        secondName={profile?.second_name || ''}
        email={profile?.email || ''}
        signalOfNewMessage={[]}
      />

      {/* Form */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Page Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <h1 className="text-3xl font-bold text-foreground">Create New Listing</h1>
          <p className="text-muted-foreground mt-2">
            Share food items or services with your community
          </p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="glass rounded-xl p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Category Selection */}
            <div className="mb-6">
              <Label htmlFor="post_type" className="text-base font-semibold mb-2 block">
                {t('category')} <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.post_type} onValueChange={(value) => handleInputChange('post_type', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">🍎 Food</SelectItem>
                  <SelectItem value="thing">🎁 Things</SelectItem>
                  <SelectItem value="borrow">🔧 Borrow</SelectItem>
                  <SelectItem value="wanted">🤲 Wanted</SelectItem>
                  <SelectItem value="foodbank">🏛️ FoodBanks</SelectItem>
                  <SelectItem value="fridge">❄️ Fridges</SelectItem>
                  <SelectItem value="business">🏛️ Organisations</SelectItem>
                  <SelectItem value="volunteer">🙌 Volunteers</SelectItem>
                  <SelectItem value="challenge">🏆 Challenges</SelectItem>
                  <SelectItem value="zerowaste">♻️ Zero Waste</SelectItem>
                  <SelectItem value="vegan">🌱 Vegan</SelectItem>
                  <SelectItem value="forum">💬 Forum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="mb-6">
              <Label htmlFor="post_name" className="text-base font-semibold mb-2 block">
                {t('title')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="post_name"
                type="text"
                value={formData.post_name}
                onChange={(e) => handleInputChange('post_name', e.target.value)}
                placeholder="e.g., Fresh Homemade Pasta"
                className="w-full"
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {formData.post_name.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div className="mb-6">
              <Label htmlFor="post_description" className="text-base font-semibold mb-2 block">
                {t('description')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="post_description"
                value={formData.post_description}
                onChange={(e) => handleInputChange('post_description', e.target.value)}
                placeholder="Describe your item in detail..."
                className="w-full min-h-[120px]"
                maxLength={500}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {formData.post_description.length}/500 characters
              </p>
            </div>

            {/* Images */}
            <div className="mb-6">
              <Label className="text-base font-semibold mb-2 block">
                {t('photos')} <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-4">
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedImages.length < MAX_IMAGES && (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="flex items-center justify-center w-full p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 transition-colors"
                    >
                      <div className="text-center">
                        <span className="text-3xl mb-2 block">📷</span>
                        <p className="text-sm text-muted-foreground">
                          {t('click_to_add_photos', { current: selectedImages.length, max: MAX_IMAGES })}
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Available Hours */}
            <div className="mb-6">
              <Label htmlFor="available_hours" className="text-base font-semibold mb-2 block">
                {t('available_hours')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="available_hours"
                type="text"
                value={formData.available_hours}
                onChange={(e) => handleInputChange('available_hours', e.target.value)}
                placeholder="e.g., Weekdays 6-8 PM"
                className="w-full"
              />
            </div>

            {/* Transportation */}
            <div className="mb-6">
              <Label htmlFor="transportation" className="text-base font-semibold mb-2 block">
                {t('transportation')}
              </Label>
              <Select value={formData.transportation} onValueChange={(value) => handleInputChange('transportation', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pickup">Pickup Only</SelectItem>
                  <SelectItem value="delivery">Can Deliver</SelectItem>
                  <SelectItem value="both">Both Pickup & Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="mb-6">
              <Label htmlFor="post_address" className="text-base font-semibold mb-2 block">
                {t('address')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="post_address"
                type="text"
                value={formData.post_address}
                onChange={(e) => handleInputChange('post_address', e.target.value)}
                placeholder="Enter your address"
                className="w-full"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('your_exact_address_wont_be_shared_publicly')}
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="flex-1"
              >
                {t('cancel')}
              </Button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 font-semibold py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {t('creating')}
                  </span>
                ) : (
                  t('create_listing')
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

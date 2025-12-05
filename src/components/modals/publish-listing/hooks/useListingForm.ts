'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ImageItem } from '../types';
import {
  DRAFT_KEY,
  MIN_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '../constants';

export interface ListingFormData {
  category: string;
  title: string;
  description: string;
  time: string;
  address: string;
  metroStation: string;
  quantity: string;
  expirationDate: string;
  tags: string[];
  dietaryLabels: string[];
  condition: string;
  contactPreferences: string[];
  scheduledDate: string;
  scheduledTime: string;
}

interface TouchedFields {
  category: boolean;
  title: boolean;
  description: boolean;
  image: boolean;
}

interface QualityScoreResult {
  score: number;
  suggestions: string[];
}

interface UseListingFormOptions {
  isOpen: boolean;
  initialCategory?: string;
  imageCount: number;
}

interface UseListingFormReturn {
  formData: ListingFormData;
  touched: TouchedFields;
  hasDraft: boolean;
  qualityScore: QualityScoreResult;
  progress: number;
  isFormValid: boolean;

  // Field setters
  setCategory: (value: string) => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setTime: (value: string) => void;
  setAddress: (value: string) => void;
  setMetroStation: (value: string) => void;
  setQuantity: (value: string) => void;
  setExpirationDate: (value: string) => void;
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  setDietaryLabels: React.Dispatch<React.SetStateAction<string[]>>;
  setCondition: (value: string) => void;
  setContactPreferences: React.Dispatch<React.SetStateAction<string[]>>;
  setScheduledDate: (value: string) => void;
  setScheduledTime: (value: string) => void;

  // Touch handlers
  setTouched: React.Dispatch<React.SetStateAction<TouchedFields>>;
  touchAll: () => void;

  // Draft management
  loadDraft: () => void;
  clearDraft: () => void;

  // Toggle handlers
  toggleDietaryLabel: (labelId: string) => void;
  toggleContactPreference: (prefId: string) => void;

  // Initialize from product
  initializeFromProduct: (product: {
    post_type?: string;
    post_name?: string;
    post_description?: string;
    available_hours?: string;
    post_stripped_address?: string;
    transportation?: string;
  } | null) => void;

  // Reset form
  resetForm: (initialCategory?: string) => void;

  // Validation errors
  showCategoryError: boolean;
  showTitleError: boolean;
  showDescriptionError: boolean;
}

export function useListingForm(options: UseListingFormOptions): UseListingFormReturn {
  const { isOpen, initialCategory = '', imageCount } = options;

  // Form state
  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [metroStation, setMetroStation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dietaryLabels, setDietaryLabels] = useState<string[]>([]);
  const [condition, setCondition] = useState('');
  const [contactPreferences, setContactPreferences] = useState<string[]>(['chat']);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Touched state
  const [touched, setTouched] = useState<TouchedFields>({
    category: false,
    title: false,
    description: false,
    image: false,
  });

  // Draft state
  const [hasDraft, setHasDraft] = useState(false);

  // Form data object
  const formData = useMemo<ListingFormData>(() => ({
    category,
    title,
    description,
    time,
    address,
    metroStation,
    quantity,
    expirationDate,
    tags,
    dietaryLabels,
    condition,
    contactPreferences,
    scheduledDate,
    scheduledTime,
  }), [
    category, title, description, time, address, metroStation,
    quantity, expirationDate, tags, dietaryLabels, condition,
    contactPreferences, scheduledDate, scheduledTime,
  ]);

  // Quality score calculation
  const qualityScore = useMemo<QualityScoreResult>(() => {
    let score = 0;
    const suggestions: string[] = [];

    // Images (25 points)
    if (imageCount >= 1) score += 10;
    if (imageCount >= 2) score += 10;
    if (imageCount >= 3) score += 5;
    if (imageCount === 0) suggestions.push('Add at least one photo');
    else if (imageCount === 1) suggestions.push('Add more photos for better visibility');

    // Title (20 points)
    if (title.length >= MIN_TITLE_LENGTH) score += 10;
    if (title.length >= 10) score += 10;
    if (title.length < MIN_TITLE_LENGTH) suggestions.push('Add a descriptive title');
    else if (title.length < 10) suggestions.push('Make your title more descriptive');

    // Description (25 points)
    if (description.length >= MIN_DESCRIPTION_LENGTH) score += 10;
    if (description.length >= 50) score += 10;
    if (description.length >= 100) score += 5;
    if (description.length < MIN_DESCRIPTION_LENGTH)
      suggestions.push('Add a detailed description');
    else if (description.length < 50)
      suggestions.push('Expand your description for more context');

    // Category (10 points)
    if (category) score += 10;
    else suggestions.push('Select a category');

    // Tags (10 points)
    if (tags.length >= 1) score += 5;
    if (tags.length >= 3) score += 5;
    if (tags.length === 0) suggestions.push('Add tags to improve discoverability');

    // Additional info (10 points)
    if (time || address) score += 5;
    if (time && address) score += 5;
    if (!time && !address) suggestions.push('Add pickup details');

    return { score, suggestions };
  }, [imageCount, title, description, category, tags.length, time, address]);

  // Progress calculation
  const progress = useMemo(() => {
    let completed = 0;
    const total = 4;
    if (imageCount > 0) completed++;
    if (category) completed++;
    if (title) completed++;
    if (description) completed++;
    return (completed / total) * 100;
  }, [imageCount, category, title, description]);

  // Form validation
  const isFormValid = category && title && description && imageCount > 0;
  const showCategoryError = touched.category && !category;
  const showTitleError = touched.title && !title;
  const showDescriptionError = touched.description && !description;

  // Check for draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      setHasDraft(true);
    }
  }, []);

  // Auto-save draft (debounced)
  useEffect(() => {
    if (isOpen && (title || description || category)) {
      const timeoutId = setTimeout(() => {
        const draft = {
          category,
          title,
          description,
          time,
          address,
          metroStation,
          quantity,
          expirationDate,
          tags,
          dietaryLabels,
          condition,
          contactPreferences,
          scheduledDate,
          scheduledTime,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setHasDraft(true);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [
    isOpen, category, title, description, time, address, metroStation,
    quantity, expirationDate, tags, dietaryLabels, condition,
    contactPreferences, scheduledDate, scheduledTime,
  ]);

  // Load draft
  const loadDraft = useCallback(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setCategory(parsed.category || '');
        setTitle(parsed.title || '');
        setDescription(parsed.description || '');
        setTime(parsed.time || '');
        setAddress(parsed.address || '');
        setMetroStation(parsed.metroStation || '');
        setQuantity(parsed.quantity || '');
        setExpirationDate(parsed.expirationDate || '');
        setTags(parsed.tags || []);
        setDietaryLabels(parsed.dietaryLabels || []);
        setCondition(parsed.condition || '');
        setContactPreferences(parsed.contactPreferences || ['chat']);
        setScheduledDate(parsed.scheduledDate || '');
        setScheduledTime(parsed.scheduledTime || '');
      } catch {
        // Invalid draft
      }
    }
  }, []);

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  }, []);

  // Toggle dietary label
  const toggleDietaryLabel = useCallback((labelId: string) => {
    setDietaryLabels((prev) =>
      prev.includes(labelId) ? prev.filter((l) => l !== labelId) : [...prev, labelId]
    );
  }, []);

  // Toggle contact preference
  const toggleContactPreference = useCallback((prefId: string) => {
    setContactPreferences((prev) => {
      if (prev.includes(prefId)) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== prefId);
      }
      return [...prev, prefId];
    });
  }, []);

  // Touch all fields
  const touchAll = useCallback(() => {
    setTouched({ category: true, title: true, description: true, image: true });
  }, []);

  // Initialize from product
  const initializeFromProduct = useCallback((product: {
    post_type?: string;
    post_name?: string;
    post_description?: string;
    available_hours?: string;
    post_stripped_address?: string;
    transportation?: string;
    condition?: string;
  } | null) => {
    if (product) {
      setCategory(product.post_type || '');
      setTitle(product.post_name || '');
      setDescription(product.post_description || '');
      setTime(product.available_hours || '');
      setAddress(product.post_stripped_address || '');
      setMetroStation(product.transportation || '');
      setCondition(product.condition || '');
    }
  }, []);

  // Reset form
  const resetForm = useCallback((initialCat?: string) => {
    setCategory(initialCat || '');
    setTitle('');
    setDescription('');
    setTime('');
    setAddress('');
    setMetroStation('');
    setQuantity('');
    setExpirationDate('');
    setTags([]);
    setDietaryLabels([]);
    setCondition('');
    setContactPreferences(['chat']);
    setScheduledDate('');
    setScheduledTime('');
    setTouched({ category: false, title: false, description: false, image: false });
  }, []);

  return {
    formData,
    touched,
    hasDraft,
    qualityScore,
    progress,
    isFormValid: !!isFormValid,

    setCategory,
    setTitle,
    setDescription,
    setTime,
    setAddress,
    setMetroStation,
    setQuantity,
    setExpirationDate,
    setTags,
    setDietaryLabels,
    setCondition,
    setContactPreferences,
    setScheduledDate,
    setScheduledTime,

    setTouched,
    touchAll,

    loadDraft,
    clearDraft,

    toggleDietaryLabel,
    toggleContactPreference,

    initializeFromProduct,
    resetForm,

    showCategoryError,
    showTitleError,
    showDescriptionError,
  };
}

'use client';

/**
 * Personal Info Client Component
 * Handles profile editing with form state management
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCurrentProfile } from '@/hooks/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthUser } from '@/app/actions/auth';

interface PersonalInfoClientProps {
  user: AuthUser;
}

export function PersonalInfoClient({ user }: PersonalInfoClientProps) {
  // Profile state from React Query
  const {
    profile: currentProfile,
    address,
    isLoading,
    updateProfile: updateProfileMutation,
    updateAddress: updateAddressMutation,
  } = useCurrentProfile(user.id);

  // Local state for editable fields
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Address fields
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  // Update local state when profile data loads
  useEffect(() => {
    if (currentProfile) {
      setFirstName(currentProfile.first_name || '');
      setLastName(currentProfile.second_name || '');
      setPhone(currentProfile.phone || '');
    }
  }, [currentProfile]);

  // Update local state when address data loads
  useEffect(() => {
    if (address) {
      setStreetAddress(address.address_line_1 || '');
      setCity(address.city || '');
      setPostalCode(address.postal_code || '');
      setCountry(String(address.country || ''));
    }
  }, [address]);

  const handleSaveName = async () => {
    if (!currentProfile?.id) return;

    await updateProfileMutation({
      id: currentProfile.id,
      first_name: firstName,
      second_name: lastName,
    });
    setEditingName(false);
  };

  const handleSavePhone = async () => {
    if (!currentProfile?.id) return;

    await updateProfileMutation({
      id: currentProfile.id,
      phone,
    });
    setEditingPhone(false);
  };

  const handleSaveAddress = async () => {
    if (!address) return;

    await updateAddressMutation({
      ...address,
      address_line_1: streetAddress,
      city,
      postal_code: postalCode,
      country: Number(country) || 0,
    });
    setEditingAddress(false);
  };

  const handleCancelName = () => {
    setFirstName(currentProfile?.first_name || '');
    setLastName(currentProfile?.second_name || '');
    setEditingName(false);
  };

  const handleCancelPhone = () => {
    setPhone(currentProfile?.phone || '');
    setEditingPhone(false);
  };

  const handleCancelAddress = () => {
    setStreetAddress(address?.address_line_1 || '');
    setCity(address?.city || '');
    setPostalCode(address?.postal_code || '');
    setCountry(String(address?.country || ''));
    setEditingAddress(false);
  };

  if (isLoading && !currentProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8">
          <Link
            href="/settings"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Account settings
          </Link>
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Personal info
          </span>
        </nav>

        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Personal info
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Provide personal details and how we can reach you
          </p>
        </motion.div>

        {/* Name Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Name
              </h2>
              {editingName ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveName} size="sm">
                      Save
                    </Button>
                    <Button onClick={handleCancelName} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {firstName} {lastName}
                </p>
              )}
            </div>
            {!editingName && (
              <Button
                onClick={() => setEditingName(true)}
                variant="ghost"
                size="sm"
                disabled={editingPhone || editingAddress}
              >
                Edit
              </Button>
            )}
          </div>
        </motion.div>

        {/* Email Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Email address
              </h2>
              <p className="text-gray-700 dark:text-gray-300">{user.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Email changes require verification and must be done through account security
              </p>
            </div>
          </div>
        </motion.div>

        {/* Phone Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-4"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Phone number
              </h2>
              {editingPhone ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSavePhone} size="sm">
                      Save
                    </Button>
                    <Button onClick={handleCancelPhone} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  {phone || 'Not provided'}
                </p>
              )}
            </div>
            {!editingPhone && (
              <Button
                onClick={() => setEditingPhone(true)}
                variant="ghost"
                size="sm"
                disabled={editingName || editingAddress}
              >
                Edit
              </Button>
            )}
          </div>
        </motion.div>

        {/* Address Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Address
              </h2>
              {editingAddress ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="streetAddress">Street address</Label>
                    <Input
                      id="streetAddress"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal code</Label>
                      <Input
                        id="postalCode"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveAddress} size="sm">
                      Save
                    </Button>
                    <Button onClick={handleCancelAddress} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-700 dark:text-gray-300">
                  {streetAddress && (
                    <>
                      <p>{streetAddress}</p>
                      <p>
                        {city && postalCode ? `${city}, ${postalCode}` : city || postalCode}
                      </p>
                      <p>{country}</p>
                    </>
                  )}
                  {!streetAddress && !city && !postalCode && !country && (
                    <p className="text-gray-500 dark:text-gray-400">Not provided</p>
                  )}
                </div>
              )}
            </div>
            {!editingAddress && (
              <Button
                onClick={() => setEditingAddress(true)}
                variant="ghost"
                size="sm"
                disabled={editingName || editingPhone}
              >
                Edit
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default PersonalInfoClient;

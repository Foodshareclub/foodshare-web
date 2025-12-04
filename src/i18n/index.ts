/**
 * i18n Module - next-intl based internationalization
 *
 * Usage in components:
 *   import { useTranslations } from 'next-intl';
 *   const t = useTranslations();
 *   <p>{t('hello_world')}</p>
 *
 * For locale switching:
 *   import { useLocale } from '@/i18n';
 */

// Re-export config
export * from './config';

// Re-export next-intl hooks for convenience
export { useTranslations, useLocale, useMessages, useNow, useTimeZone } from 'next-intl';

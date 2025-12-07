'use client';

/**
 * Re-export NavbarWrapper from its canonical location
 * @deprecated Import from '@/components/header/navbar/NavbarWrapper' instead
 */
export { NavbarWrapper } from '@/components/header/navbar/NavbarWrapper';

/**
 * @deprecated Use NavbarWrapper with defaultProductType="forum" instead
 */
export const ForumNavbarWrapper = () => {
  const { NavbarWrapper } = require('@/components/header/navbar/NavbarWrapper');
  return <NavbarWrapper defaultProductType="forum" />;
};

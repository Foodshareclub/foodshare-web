import React from "react";

type ContainerProps = {
  productType: string;
  getRoute: (route: string) => void;
  setProductType: (productType: string) => void;
  children?: React.ReactNode;
};

/**
 * ChangeLanguageContainer - Legacy wrapper for compatibility
 *
 * Note: I18n is now handled by NextIntlClientProvider in providers.tsx
 * This component is kept for backward compatibility and simply passes through children.
 */
const ChangeLanguageContainer: React.FC<ContainerProps> = ({
  children,
}) => {
  return <>{children}</>;
};

export default ChangeLanguageContainer;

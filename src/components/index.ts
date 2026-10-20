// Alert & Notifications
/**
 * Provides alert and notification components for user feedback.
 * Includes modals and component-based notification systems.
 */
export { default as AlertComponent } from "./alert/AlertComponent";
export { default as PopupNotificationModal } from "./modals/PopupNotificationModal";

// Product Components
/**
 * Product display and related components.
 * Handles product card rendering, skeleton states, and product location display.
 */
export { ProductCard } from "./productCard/ProductCard";
export { default as SkeletonCard } from "./productCard/SkeletonCard";
export { OneProduct } from "./oneProduct/OneProduct";
export { OneProductContainer } from "./oneProduct/OneProductContainer";
export { default as AsideProducts } from "./asideProducts/AsideProducts";
export { ProductsLocation } from "./productsLocation/ProductLocation";

// Auth & Security
/**
 * Authentication and authorization guards for route protection.
 * Also includes become-sharer block for user onboarding flows.
 */
export { AuthGuard, RequireAuth, RequireGuest, RequireAdmin } from "./guards/AuthGuard";
export { BecomeSharerBlock } from "./becomeSharerBlock/BecomeSharerBlock";
export { BecomeSharerButton } from "./becomeSharerBlock/BecomeSharerButton";
export { AddListingButton } from "./becomeSharerBlock/AddListingButton";

// User Profile & Personal Info
/**
 * User profile and personal information display components.
 * Avatar variants, profile blocks, and contact information displays.
 */
export { default as Avatar } from "./avatar/Avatar";
export { UnifiedAvatar, DisplayAvatar, RippleAvatar, UploadAvatar } from "./avatar/UnifiedAvatar";
export { default as AvatarWithRipple } from "./listingPersonCard/AvatarWithRipple";
export { default as PersonCard } from "./personCard/PersonCard";
export { default as ListingPersonCards } from "./listingPersonCard/ListingPersonCards";
export { MinifiedUserInfo } from "./minifiedUserInfo/MinifiedUserInfo";
export { NameBlock } from "./profile/NameBlock";
export { EmailBlock } from "./profile/EmailBlock";
export { PhoneNumberBlock } from "./profile/PhoneNumberBlock";

// UI Library Molecules
/**
 * Composed UI molecules combining multiple atoms into functional units.
 * SearchField provides standardized search input; StatusBadge displays status with color coding.
 */
export { SearchField } from "./ui-library/molecules/SearchField";
export { StatusBadge } from "./ui-library/molecules/StatusBadge";

// UI Library Organisms
/**
 * Complex UI organisms combining molecules and atoms into page-level components.
 * UserProfileCard combines avatar, status, and activity count.
 * NavigationHeader combines branding, actions, and search.
 * ProductGrid displays products in responsive grid layout.
 */
export { UserProfileCard } from "./ui-library/organisms/UserProfileCard";
export { NavigationHeader } from "./ui-library/organisms/NavigationHeader";
export { ProductGrid } from "./ui-library/organisms/ProductGrid";

// Chat Components
/**
 * Chat and messaging components for real-time communication.
 * Input section, message windows, and chat container systems.
 */
export { InputSection } from "./chat/InputSection";
export { MessagesWindow } from "./chat/MessagesWindow";
export { default as ContactsBlock } from "./chat/ContactsBlock";
export { default as ContainerForChat } from "./containerForChat/ContainerForChat";
export { UnifiedChatContainer } from "./chat/UnifiedChatContainer";
export { UnifiedChatList } from "./chat/UnifiedChatList";

// Layout Components
/**
 * Page layout and navigation components.
 * Header/footer main sections, profile settings, and navigation bars.
 */
export { default as Header } from "./header/Header";
export { default as Footer } from "./footer/Footer";
export { Main } from "./main/Main";
export { default as ProfileSettings } from "./header/ProfileSettings";
export { default as FilterProductComponent } from "./header/FilterProductComponent";
export { Navbar } from "./header/navbar";

// Modals
/**
 * Dialog and modal components for user interactions.
 * Authentication, password recovery, navigation drawers, and confirmation modals.
 */
export { default as AuthenticationUserModal } from "./modals/AuthenticationUser/AuthenticationUserModal";
export { PasswordRecoveryModal } from "./modals/AuthenticationUser/PasswordRecoveryModal";
export { default as NavDrawer } from "./modals/NavDrawer";
export { default as VolunteerInfoModal } from "./modals/VolunteerInfoModal";
export { default as DeleteCardModal } from "./modals/DeleteCardModal";
export { ConfirmationModal, DeleteConfirmationModal } from "./modals/ConfirmationModal";

// Drawers & Responsive Containers
/**
 * Drawer and responsive container components for adaptive layouts.
 * Side drawers, product drawers, universal drawers, and responsive containers.
 */
export { ContactsBlockDrawerContainer } from "./drawerContainers/ContactsBlockDrawerContainer";
export { OneProductDrawerContainer } from "./drawerContainers/OneProductDrawerContainer";
export { default as UniversalDrawer } from "./universalDrawer/UniversalDrawer";
export { ResponsiveContainer } from "./shared/ResponsiveContainer";

// UI Components
/**
 * General UI components used across the application.
 * Carousel, comment systems, star ratings, navigation buttons, and settings cards.
 */
export { default as Carousel } from "./carousel/Carousel";
export { default as ItemsForCarousel } from "./carousel/ItemsForCarousel";
export { default as Comments } from "./comments/Comments";
export { RequiredStar } from "./requiredStar/RequiredStar";
export { SettingsCard } from "./settingsCard/SettingsCard";
export { default as NavigateButtons } from "./navigateButtons/NavigateButtons";

// Map Components
/**
 * Map and location-based components.
 * Search menus, user location markers, and map integration components.
 */
export { SearchMenu } from "./leaflet/SearchMenu";
export { default as UserLocationMarker } from "./leaflet/UserLocationMarker";

// Volunteer Components
/**
 * Volunteer-related components for community engagement.
 */
export { VolunteerCards } from "./volunteerCard/VolonterCards";
// Note: OneVolunteer is a Server Component - import directly from "./volunteerCard/OneVolunteer"

// Localization
/**
 * Localization and language selection components.
 * Language selector and change language containers for multi-language support.
 */
export { default as LanguageSelector } from "./languageSelector/LanguageSelector";
export { default as ChangeLanguageContainer } from "./localization/ChangeLanguageContainer";

// Error Boundaries
/**
 * Error boundary components for graceful error handling.
 * Feature, async, and wrapper boundaries for improved UX on errors.
 */
export { FeatureErrorBoundary, AsyncErrorBoundary, withErrorBoundary } from "./ErrorBoundary";

// Glass utilities - Use Tailwind classes: glass, glass-subtle, glass-prominent
// Or use Button/Dialog/Drawer with variant="glass"
// See: src/components/ui/glass.tsx for CVA-based Glass component

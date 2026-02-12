// Alert & Notifications
export { default as AlertComponent } from "./alert/AlertComponent";
export { default as PopupNotificationModal } from "./modals/PopupNotificationModal";

// Product Components
export { ProductCard } from "./productCard/ProductCard";
export { default as SkeletonCard } from "./productCard/SkeletonCard";
export { OneProduct } from "./oneProduct/OneProduct";
export { OneProductContainer } from "./oneProduct/OneProductContainer";
export { default as AsideProducts } from "./asideProducts/AsideProducts";
export { ProductsLocation } from "./productsLocation/ProductLocation";

// User Profile & Personal Info
export { default as Avatar } from "./avatar/Avatar";
export { UnifiedAvatar, DisplayAvatar, RippleAvatar, UploadAvatar } from "./avatar/UnifiedAvatar";
export { default as AvatarWithRipple } from "./listingPersonCard/AvatarWithRipple";
export { default as PersonCard } from "./personCard/PersonCard";
export { default as ListingPersonCards } from "./listingPersonCard/ListingPersonCards";
export { MinifiedUserInfo } from "./minifiedUserInfo/MinifiedUserInfo";
export { NameBlock } from "./profile/NameBlock";
export { EmailBlock } from "./profile/EmailBlock";
export { PhoneNumberBlock } from "./profile/PhoneNumberBlock";
export { AddressBlock } from "./profile/AddressBlock";
export { BecomeSharerBlock } from "./becomeSharerBlock/BecomeSharerBlock";
export { BecomeSharerButton } from "./becomeSharerBlock/BecomeSharerButton";
export { AddListingButton } from "./becomeSharerBlock/AddListingButton";

// Chat Components
export { InputSection } from "./chat/InputSection";
export { MessagesWindow } from "./chat/MessagesWindow";
export { default as ContactsBlock } from "./chat/ContactsBlock";
export { default as ContainerForChat } from "./containerForChat/ContainerForChat";
export { UnifiedChatContainer } from "./chat/UnifiedChatContainer";
export { UnifiedChatList } from "./chat/UnifiedChatList";

// Layout Components
export { default as Header } from "./header/Header";
export { default as Footer } from "./footer/Footer";
export { Main } from "./main/Main";
export { default as ProfileSettings } from "./header/ProfileSettings";
export { default as FilterProductComponent } from "./header/FilterProductComponent";
export { Navbar } from "./header/navbar";

// Modals
export { default as AuthenticationUserModal } from "./modals/AuthenticationUser/AuthenticationUserModal";
export { PasswordRecoveryModal } from "./modals/AuthenticationUser/PasswordRecoveryModal";
export { default as NavDrawer } from "./modals/NavDrawer";
export { default as VolunteerInfoModal } from "./modals/VolunteerInfoModal";
export { default as DeleteCardModal } from "./modals/DeleteCardModal";
export { ConfirmationModal, DeleteConfirmationModal } from "./modals/ConfirmationModal";

// Drawers & Responsive Containers
export { ContactsBlockDrawerContainer } from "./drawerContainers/ContactsBlockDrawerContainer";
export { OneProductDrawerContainer } from "./drawerContainers/OneProductDrawerContainer";
export { default as UniversalDrawer } from "./universalDrawer/UniversalDrawer";
export { ResponsiveContainer } from "./shared/ResponsiveContainer";

// UI Components
export { default as Carousel } from "./carousel/Carousel";
export { default as ItemsForCarousel } from "./carousel/ItemsForCarousel";
export { default as Comments } from "./comments/Comments";
export { SearchField } from "./searchField/SearchField";
export { RequiredStar } from "./requiredStar/RequiredStar";
export { SettingsCard } from "./settingsCard/SettingsCard";
export { default as NavigateButtons } from "./navigateButtons/NavigateButtons";

// Map Components
export { SearchMenu } from "./leaflet/SearchMenu";
export { default as UserLocationMarker } from "./leaflet/UserLocationMarker";

// Volunteer Components
// Note: OneVolunteer is a Server Component - import directly from "./volunteerCard/OneVolunteer"
export { VolunteerCards } from "./volunteerCard/VolonterCards";

// Localization
export { default as LanguageSelector } from "./languageSelector/LanguageSelector";
export { default as ChangeLanguageContainer } from "./localization/ChangeLanguageContainer";

// Error Boundaries
export { FeatureErrorBoundary, AsyncErrorBoundary, withErrorBoundary } from "./ErrorBoundary";

// Auth Guards
export { AuthGuard, RequireAuth, RequireGuest, RequireAdmin } from "./guards/AuthGuard";

// Glass utilities - Use Tailwind classes: glass, glass-subtle, glass-prominent
// Or use Button/Dialog/Drawer with variant="glass"
// See: src/components/ui/glass.tsx for CVA-based Glass component

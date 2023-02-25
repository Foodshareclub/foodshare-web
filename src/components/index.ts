import Avatar from "@/components/avatar/Avatar";
import Carousel from "@/components/carousel/Carousel";
import Comments from "@/components/comments/Comments";
import Footer from "@/components/footer/Footer";
import FilterProductComponent from "@/components/header/FilterProductComponent";
import Header from "@/components/header/Header";
import NavComponent from "@/components/header/NavComponent";
import ProfileSettings from "@/components/header/ProfileSettings";
import LanguageSelector from "@/components/languageSelector/LanguageSelector";
import ChangeLanguageContainer from "@/components/localization/ChangeLanguageContainer";
import {Main} from "@/components/main/Main";
import NavDrawer from "@/components/modals/NavDrawer";
import PopupNotificationModal from "@/components/modals/PopupNotificationModal";
import PublishListingModal from "@/components/modals/PublishListingModal";
import UpdateProfileModal from "@/components/modals/UpdateProfileModal";
import VolunteerPage from "@/pages/volunteerPages/VolunteerPage";
import AuthenticationUserModal from "@/components/modals/AuthenticationUser/AuthenticationUserModal";
import {CredentialsBlock} from "@/components/modals/AuthenticationUser/CredentialsBlock";
import {EmailArea} from "@/components/modals/AuthenticationUser/EmailArea";
import {Notification} from "@/components/modals/AuthenticationUser/NotificationModal";
import {PasswordRecoveryModal} from "@/components/modals/AuthenticationUser/PasswordRecoveryModal";
import {PhoneArea} from "@/components/modals/AuthenticationUser/PhoneArea";
import {RequiredStar} from "@/components/requiredStar/RequiredStar";
import VolunteerInfoModal from "@/components/modals/VolunteerInfoModal";
import {SearchField} from "@/components/searchField/SearchField";
import {ProductCard} from "@/components/productCard/ProductCard";
import {OneProduct} from "@/components/oneProduct/OneProduct";
import {ProductsLocation} from "@/components/productsLocation/ProductLocation";
import AsideProducts from "@/components/asideProducts/AsideProducts";
import PersonCard from "./personCard/PersonCard";
import ListingPersonCards from "@/components/listingPersonCard/ListingPersonCards";
import AlertComponent from "@/components/alert/AlertComponent";
import {NameBlock} from "@/components/personalInfoComponents/NameBlock";
import {PhoneNumberBlock} from "@/components/personalInfoComponents/PhoneNumberBlock";
import {EmailBlock} from "@/components/personalInfoComponents/EmailBlock";
import {AddressBlock} from "@/components/personalInfoComponents/AddressBlock";
import {SettingsCard} from "@/components/settingsCard/SettingsCard";
import {BecomeSharerBlock} from "@/components/becomeSharerBlock/BecomeSharerBlock";
import {MinifiedUserInfo} from "@/components/minifiedUserInfo/MinifiedUserInfo";
import {OneProductContainer} from "@/components/oneProduct/OneProductContainer";
import ContactsBlock from "@/components/chatComponents/ContactsBlock";
import {MessagesWindow} from "@/components/chatComponents/MassagesWindow";
import {InputSection} from "@/components/chatComponents/InputSection";
import UniversalDrawer from "@/components/universalDrawer/UniversalDrawer";
import {OneProductDrawerContainer} from "@/components/drawerContainers/OneProductDrawerContainer";
import {ContactsBlockDrawerContainer} from "@/components/drawerContainers/ContactsBlockDrawerContainer";

export {
    OneProductDrawerContainer,
    ContactsBlockDrawerContainer,
    UniversalDrawer,
    InputSection,
    MessagesWindow,
    Main,
    VolunteerPage,
    CredentialsBlock,
    AuthenticationUserModal,
    Header,
    Footer,
    Avatar,
    NavDrawer,
    ChangeLanguageContainer,
    PublishListingModal,
    PopupNotificationModal,
    Carousel,
    Comments,
    LanguageSelector,
    ProfileSettings,
    NavComponent,
    UpdateProfileModal,
    PasswordRecoveryModal,
    Notification,
    EmailArea,
    FilterProductComponent,
    PhoneArea,
    RequiredStar,
    VolunteerInfoModal,
    SearchField,
    ProductCard,
    OneProduct,
    ProductsLocation,
    AsideProducts,
    ListingPersonCards,
    PersonCard,
    AlertComponent,
    NameBlock,
    EmailBlock,
    PhoneNumberBlock,
    AddressBlock,
    SettingsCard,
    BecomeSharerBlock,
    MinifiedUserInfo,
    OneProductContainer,
    ContactsBlock
}
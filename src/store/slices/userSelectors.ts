import {StateAppType} from "@/store/redux-store";


//data from value
export const userFirstNameSelector = (state: StateAppType) => state.user.value.first_name;
export const userSecondNameSelector = (state: StateAppType) => state.user.value.second_name;
export const userEmailSelector = (state: StateAppType) => state.user.value.email;
export const avatarURLSelector = (state: StateAppType) => state.user.value.avatar_url;
export const userAddressSelector = (state: StateAppType) => state.user.userAddress;
export const allCountriesSelector = (state: StateAppType) => state.user.userCountries;
export const userCountrySelector = (state: StateAppType, userCountryId: number) => state.user.userCountries.find((item: { id: number; }) => item.id === userCountryId);
//data from session
export const userIdFromSessionSelector = (state: StateAppType) => state.user.session?.user?.id;
export const userEmailFromSessionSelector = (state: StateAppType) => state.user.session?.user?.email;

//data from initial state

export const isAuthSelector = (state: StateAppType) => state.user.isAuth;
export const userLocationSelector = (state: StateAppType) => state.user.userLocation;
export const languageSelector = (state: StateAppType) => state.user.language;

export const isUpdateProfileSelector = (state: StateAppType) => state.user.isUpdateProfile;
export const messageProfileSelector = (state: StateAppType) => state.user.message;
export const updateUserEffectSelector = (state: StateAppType) => state.user.updateUserEffect;

export const volunteersSelector = (state: StateAppType) => state.user.volunteers;
export const anotherUserSelector = (state: StateAppType) => state.user.anotherUser;


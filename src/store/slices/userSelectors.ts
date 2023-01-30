import {StateAppType} from "@/store/redux-store";

//data from value
export const userFirstNameSelector = (state: StateAppType) => state.user.value.first_name;
export const userSecondNameSelector = (state: StateAppType) => state.user.value.second_name;
export const userIdSelector = (state: StateAppType) => state.user.value.id;
export const avatarURLSelector = (state: StateAppType) => state.user.value.avatar_url;

//data from session
export const userIdFromSessionSelector = (state: StateAppType) => state.user.session.user.id;

//data from initial state
export const imgURLSelector = (state: StateAppType) => state.user.imgUrl;
export const isAuthSelector = (state: StateAppType) => state.user.isAuth;
export const languageSelector = (state: StateAppType) => state.user.language;
export const isRegisterSelector = (state: StateAppType) => state.user.isRegister;
export const isUpdateSelector = (state: StateAppType) => state.user.isUpdate;
export const isLoadingSelector = (state: StateAppType) => state.user.isLoading;
export const isUpdateProfileSelector = (state: StateAppType) => state.user.isUpdateProfile;
export const messageProfileSelector=(state:StateAppType)=>state.user.message;

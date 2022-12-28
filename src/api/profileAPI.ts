import {instance} from "./axiosInstance";

export type ResponseType = {
    avatar: string
    created: string
    email: string
    isAdmin: boolean
    name: string
    publicCardPacksCount: number
    rememberMe: boolean
    token: string
    tokenDeathTime: number
    updated: string
    verified: boolean
    __v: number
    _id: string
}
export type UpdatedUserResponseType = {
    updatedUser: ResponseType
    error?: string
}
export type PayLoadType = {
    name?: string
    avatar?: string
}
export type RegistrationResponseType = {
    addedUser: any
    error: string;
}

export type AuthPayload = {
    email: string
    password?: string
    phone?:string
    rememberMe?: boolean
    captcha?: string
}
export const profileAPI = {
    login(email: string, password: string) {
        return instance.post<ResponseType>('auth/login',
            {email, password}
        );
    },
    logOut() {
        return instance.delete<ResponseType>('auth/me');
    }
};

export const registrationAPI = {
    registration(email: string, password: string) {
        return instance.post<RegistrationResponseType>('auth/register',
            {email, password}
        );
    }
};
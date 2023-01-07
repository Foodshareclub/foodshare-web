import {supabase} from "../supaBase.config";
import {AuthError, AuthResponse, AuthSession, OAuthResponse, User, UserResponse} from "@supabase/supabase-js";

export type DataType = {
    user: User
    session: null | AuthSession
}
export type ResponseType = {
    data: DataType
    error: null | AuthError
}

export type AuthPayload = {
    email: string
    firstName: string
    lastName: string
    age?: string
    password: string
    phone?: string
    rememberMe?: boolean
    captcha?: string
}
export type ProviderType = "google" | "apple" | "github" | "facebook"
export const profileAPI = {
    registration({email, password, firstName, lastName}: AuthPayload): Promise<AuthResponse> {
        return supabase.auth.signUp({
            email,
            password, options: {data: {firstName, lastName}, emailRedirectTo: window.location.origin}
        })
    },
    loginWithPass(email: string, password: string): Promise<AuthResponse> {
        return supabase.auth.signInWithPassword({
                email, password
            }
        )
    },
    loginWithPhone(phone: string, password: string): Promise<AuthResponse> {
        return supabase.auth.signInWithPassword({
                phone, password
            }
        )
    },
    loginWithOAuth(provider: ProviderType): Promise<OAuthResponse> {
        return supabase.auth.signInWithOAuth({
                provider
            }
        )
    },
    logOut(): Promise<{ error: AuthError | null }> {
        return supabase.auth.signOut()
    },
    getUser(): Promise<UserResponse> {
        return supabase.auth.getUser()
    },
    recoveryPassword(email:string): Promise<{ data: {}; error: null } | { data: null; error: AuthError }> {
        return supabase.auth.resetPasswordForEmail(email)
    }
};

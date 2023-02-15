import {supabase} from "@/supaBase.config";
import {
    AuthError,
    AuthResponse,
    AuthSession,
    OAuthResponse,
    PostgrestSingleResponse,
    User,
} from "@supabase/supabase-js";
import {MobileOtpType} from "@supabase/gotrue-js/dist/module/lib/types";
export type CountryType={
    continent:any
    id: number
    iso2: string
    iso3:string
    local_name:any
    name:string
}
export type AddressType={
    address_line_1:string
    address_line_2:string
    address_line_3?:string
    city:string
    country:number
    county:string
    postal_code:string
    profile_id:string
    state_province:string
}
export type AllValuesType = {
    created_time: string
    email?: string,
    id: string,
    liked_post: string
    about_me: string
    avatar_url: string
    birth_date: string
    first_name: string,
    phone_number: string
    second_name: string,
    updated_at: Date,
    user_address: string,
    user_location: string
    user_metro_station: string
    username: string
}
export type ImgUrlType = {
    dir: string, imgUrl: string
}
export type UploadImgUrlType = {
    dir: string
    filePath: string
    file: File
}
export type GetValueType = {
    fromTableName: string
    columnValue: string
    columnValueItem: string
    selectRow: Array<string> | string
}
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
        return supabase.auth.signUp({
                phone, password
            }
        )
    },
    signInWithProvider(provider: ProviderType) {
        return supabase.auth.signInWithOAuth({provider})
    },
    verifyOtp(phone: string, token: string, type: MobileOtpType): Promise<AuthResponse> {
        return supabase.auth.verifyOtp({token, phone, type})
    },
    logOut(): Promise<{ error: AuthError | null }> {
        return supabase.auth.signOut()
    },
    getValue(userId:string): PromiseLike<PostgrestSingleResponse<AllValuesType>> {
        return supabase
            .from("profiles")
            .select("*")
            .eq('id', userId)
            .single()
    },
    recoveryPassword(email: string) {
        return supabase.auth
            .resetPasswordForEmail(email);
    },
    setNewPassword(password: string) {
        return supabase.auth.updateUser({ password });
    },
    downloadImgFromDB(value: ImgUrlType): Promise<{ data: Blob; error: null } | { data: null; error: RangeError }> {
        return supabase.storage.from(`${value.dir}`).download(`${value.imgUrl}`)
    },
    uploadImgFromDB(value: UploadImgUrlType): Promise<{ data: { path: string }; error: null } | { data: null; error: RangeError }> {
        return supabase.storage.from(`${value.dir}`).upload(value.filePath, value.file,{upsert:true})
    },
    updateProfile(updates: AllValuesType) {
        return supabase.from('profiles').upsert(updates)
    },
    updateAddress(updates:AddressType) {
        return supabase.from('address').upsert(updates)
    },
    getUserAddress(userId: string) {
        return supabase.from('address').select("*").eq("profile_id",userId)
    },
    getAllCountries() {
        return supabase.from('countries').select("*")
    },
    getVolunteer(): PromiseLike<PostgrestSingleResponse<Array<AllValuesType>>> {
        return supabase
            .from('profiles').select("*")
            .eq('roles', "{subscriber,volunteer,admin}")//а как только волонтера достать из массива
            .limit(50)
    },
    getAnotherUser(userId:string): PromiseLike<PostgrestSingleResponse<AllValuesType>> {
        return supabase
            .from("profiles")
            .select("*")
            .eq('id', userId)
            .single()
    },
};

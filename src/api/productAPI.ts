import {supabase} from "../supaBase.config";
import {AuthPayload} from "./profileAPI";
import {InitialProductStateType} from "../store/slices/productReducer";
import {PostgrestResponse} from "@supabase/supabase-js";

export type ProductObjType = {
    gif_url: string,
    post_type: string,
    post_name: string,
    post_description: string,
    pickup_time: string,
    post_address: string,
    post_metro_station: string,
    user: string
}
export const productAPI = {
    getAllProducts(){
        return supabase
            .from('posts')
            .select('*')
    },
    getProduct(productType: string) {
        return supabase
            .from('posts')
            .select('*')
            .eq('post_type', productType.toLowerCase())
    },
    getCurrentUserProduct(currentUserID: string) {
        return supabase
            .from('posts')
            .select('*')
            .eq('user', currentUserID)
    },
    createProduct(createdProduct: ProductObjType){
        return supabase
            .from('posts')
            .insert(createdProduct)
    },
    deleteProduct(productID: number) {
        return supabase
            .from('posts')
            .delete()
            .eq('id', productID);
    }
}
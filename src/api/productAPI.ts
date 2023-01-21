import {supabase} from "../supaBase.config";
import {AuthPayload} from "./profileAPI";
import {InitialProductStateType} from "../store/slices/foodReducer";

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
    createProduct(createdProduct: any) {
        return supabase
            .from('posts')
            .insert(createdProduct)
    }
}
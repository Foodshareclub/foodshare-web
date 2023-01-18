import {supabase} from "../supaBase.config";

export const productAPI = {
    getAllProducts() {
        return supabase
            .from('posts')
            .select('*')
    },
    getProduct(productType: string) {
        return supabase
            .from('posts')
            .select('*')
            .eq('post_type', productType.toLowerCase())
    }
}
import {supabase} from "@/supaBase.config";

export type ProductObjType = {
    gif_url: string,
    post_type: string,
    post_name: string,
    post_description: string,
    pickup_time: string,
    post_address: string,
    post_metro_station: string,
    user: string
    id?: number
    post_unpublished?: boolean
}

export const productAPI = {
    getAllProducts() {
        return supabase
            .from('posts')
            .select('*')
    },
    getProducts(productType: string) {
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
    getOneProduct(productId: number) {
        return supabase
            .from('posts')
            .select('*')
            .eq('id', productId)
    },
    //заменим insert на upsert
    createProduct(createdProduct: ProductObjType) {
        return supabase
            .from('posts')
            .insert(createdProduct)
    },
    updateProduct(createdProduct: ProductObjType) {
        return supabase.from("posts").upsert(createdProduct)
    },
    deleteProduct(productID: number) {
        return supabase
            .from('posts')
            .delete()
            .eq('id', productID);
    },
    searchProducts(searchWord: string, productSearchType: string) {
        if (productSearchType !== 'all') {
            return supabase
                .from('posts')
                .select('*')
                .eq('post_type', productSearchType)
                .textSearch('post_name', searchWord, {
                    type: 'websearch'
                })
        }else {
            return supabase
                .from('posts')
                .select('*')
                .textSearch('post_name', searchWord, {
                    type: 'websearch'
                })
        }
    }
}
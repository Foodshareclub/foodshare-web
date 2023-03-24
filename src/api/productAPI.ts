import {supabase} from "@/supaBase.config";
import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {ReviewsType} from "@/api/chatAPI";

type  LocationsInfo = {
    _latitude: number
    _longitude: number
}
export type InitialProductStateType = {
    available_hours: string
    created_att: string
    five_star: null
    four_star: null
    gif_url: string
    gif_url_2: string
    gif_url_3: string
    id: number
    locations: LocationsInfo
    pickup_time: string
    post_address: string
    post_arranged: boolean
    post_description: string
    post_like_counter: number
    post_metro_station: string
    post_name: string
    post_type: string
    post_published: boolean
    post_views: number
    profile_id: string
    user: string
    reviews: Array<ReviewsType>
}

export type LocationType = {
    locations: LocationsInfo
    post_name: string
};

export const productAPI = {
    getAllProducts() {
        return supabase
            .from('posts')
            .select('*')
    },
    getProducts(productType: string): PromiseLike<PostgrestSingleResponse<Array<InitialProductStateType>>> {
        return supabase
            .from('posts')
            .select(`*,reviews(*)`)
            .eq('post_type', productType.toLowerCase())
    },
    getProductsLocation(productType: string): PromiseLike<PostgrestSingleResponse<Array<LocationType>>> {
        return supabase
            .from('posts')
            .select('locations,post_name')
            .eq('post_type', productType.toLowerCase())
    },
    getCurrentUserProduct(currentUserID: string) {
        return supabase
            .from('posts')
            .select('*')
            .eq('user', currentUserID)
    },
    getOneProduct(productId: number): any {
        return supabase
            .from('posts')
            .select(`*,reviews(*)`)
            .eq('id', productId)
    },
    //заменим insert на upsert
    createProduct(createdProduct: Partial<InitialProductStateType>) {
        return supabase
            .from('posts')
            .insert(createdProduct)
    },
    updateProduct(createdProduct: Partial<InitialProductStateType>) {
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
        } else {
            return supabase
                .from('posts')
                .select('*')
                .textSearch('post_name', searchWord, {
                    type: 'websearch'
                })
        }
    }
}
import {StateAppType} from "@/store/redux-store";

//Array products
export const productsSelector = (state: StateAppType) => state.product.products;
export const searchProductsSelector = (state: StateAppType) => state.product.searchProducts;

export const currentUserProductsSelector = (state: StateAppType) => state.product.currentUserProducts;
export const isUpdateProductSelector = (state: StateAppType) => state.product.isUpdateProduct;
export const messageProductSelector = (state: StateAppType) => state.product.message;
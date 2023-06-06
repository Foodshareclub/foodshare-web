import {StateAppType} from "@/store/redux-store";

//Array products
export const productsSelector = (state: StateAppType) => state.product.products;
export const oneProductSelector = (state: StateAppType) => state.product.oneProduct[0];
export const searchProductsSelector = (state: StateAppType) => state.product.searchProducts;
export const productStatusSelector = (state: StateAppType) => state.product.status;
export const currentUserProductsSelector = (state: StateAppType) => state.product.currentUserProducts;
export const isUpdateProductSelector = (state: StateAppType) => state.product.isUpdateProduct;
export const updateProductEffectSelector = (state: StateAppType) => state.product.updateProductEffect;
export const messageProductSelector = (state: StateAppType) => state.product.message;
export const productsLocationSelector = (state: StateAppType) => state.product.productsLocation;
export const geoDistanceSelector = (state: StateAppType) => state.product.geoDistance;
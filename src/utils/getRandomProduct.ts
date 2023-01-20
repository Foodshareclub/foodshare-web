import {ProductStateType} from "../store/slices/foodReducer";

export function getRandomProducts (products: Array<ProductStateType>) {
    const lastElement = products.length;

    const randomProduct = Math.floor(Math.random() * lastElement + 1);

    if (randomProduct >= 3) {
        return [
            products[randomProduct - 1],
            products[randomProduct - 2],
            products[randomProduct - 3]
        ];

    } else if (randomProduct >= 0 && lastElement < 2 && randomProduct !== lastElement) {
        return [
            products[randomProduct],
            products[lastElement]
        ];
    }

    return [products[0]];
}
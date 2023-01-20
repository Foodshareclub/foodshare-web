import {ProductStateType} from "../store/slices/foodReducer";

export function getRandomProducts(products: Array<ProductStateType>, product: ProductStateType) {
    const productsWithoutItem = products.filter(prod => prod.id !== product.id);

    const indexesArray = productsWithoutItem
        .map((el, i) => i)
        .sort(() => Math.random() - 0.5)

    let randomElementsArray = [];

    for (let i = 0; i <= productsWithoutItem.length - 1; i++) {
        if (i < 3) {
            randomElementsArray.push(productsWithoutItem[indexesArray[i]]);
        } else {
            break;
        }
    }

    return randomElementsArray;
}
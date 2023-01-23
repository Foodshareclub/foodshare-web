import {InitialProductStateType} from "../store/slices/productReducer";

export function getRandomProducts(products: Array<InitialProductStateType>, product: InitialProductStateType) {
    const productsWithoutItem = products.filter(prod => prod.id !== product.id);

    const indexesArray = productsWithoutItem
        .map((el, i) => i)
        .sort(() => Math.random() - 0.5)

    let randomElementsArray = [] as  Array<InitialProductStateType>;

    for (let i = 0; i <= productsWithoutItem.length - 1; i++) {
        if (i < 3) {
            randomElementsArray.push(productsWithoutItem[indexesArray[i]]);
        } else {
            break;
        }
    }

    return randomElementsArray;
}
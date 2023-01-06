import React from 'react';
import ProductPage from "../productPage/ProductPage";
import birthday from "../../assets/birthday.png"

const BorrowPage = () => {
    const obj = {
        img: birthday,
        name: '@Ginagonzales',
        description: '20 assorted candy bars',
        available_time: '6 - 9pm',
        distance: '8mi',
        property: {
            imageAlt: 'Rear view of modern home with pool',
            numbLikes: 4,
            about: 'The birthday party decorations come in rainbow colors. the baby shower decorations I only have in blue. I have a few tropical themed decorations as well. ',
            pickUpAddress: '54321 Sunny Ln.\n' +
                'San Francisco, CA 94016',
            rating: 4,
            type: 'Party decorations',
            reviews: "1,000",
            quantity: 10
        }
    }
    return (
        <ProductPage obj={obj} buttonValue="Borrow"/>
    );
};

export default BorrowPage;
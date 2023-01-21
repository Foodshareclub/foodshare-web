import React from 'react';
import ProductPage from "../productPage/ProductPage";
import battery from "../../assets/battery.png";
import {t} from "@lingui/macro";

const WantedPage = () => {
    const obj = {
        img: battery,
        name: '@FoodShare55',
        description: '20 assorted candy bars',
        available_time: '6 - 9pm',
        distance: '12mi',
        property : {
            imageAlt: 'Rear view of modern home with pool',
            numbLikes: 4,
            about: 'I ran out of AA batteries, and would appreciate anyone that can spare 10 of them. Thank you !! ',
            pickUpAddress: '54321 Sunny Ln.San Francisco, CA 94016',
            rating: 4,
            type: 'AA Batteries',
            reviews: "1,000",
            quantity: 10
        }
    }
    return (
        <ProductPage obj={obj} buttonValue={t({
            id: `Offer Item(s)`,
            message: `Offer Item(s)`
        })}/>
    );
};

export default WantedPage;
import hello from '../assets/hello-i-m-nik-hehUfVxG8Xk-unsplash 1.png';
import strawberry from '../assets/Rectangle 53.png';
import pizza from '../assets/Rectangle 54.png';
import sweets from '../assets/Rectangle 55.png';

type MockElT = {
    img: string,
    name: string,
    description: string,
    available_time: string,
    distance: string
}

export const mockArray: Array<MockElT> = [
    {
        img: hello,
        name: 'Shelly1994',
        description: 'Two bags of carrot',
        available_time: '6 - 9pm',
        distance: '3.2mi'
    },
    {
        img: strawberry,
        name: 'Juniper Cafe',
        description: '10 pounds of strawberries',
        available_time: '3/1 - 3-15',
        distance: '5mi'
    },
    {
        img: pizza,
        name: "Paco's Pizzeria",
        description: '5 boxes of pepperoni and sausage pizza',
        available_time: '8pm - 12pm',
        distance: '10mi'
    },
    {
        img: sweets,
        name: '@FoodShare55',
        description: '20 assorted candy bars',
        available_time: '6 - 9pm',
        distance: '12mi'
    }
]
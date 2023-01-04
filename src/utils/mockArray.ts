import hello from '../assets/hello-i-m-nik-hehUfVxG8Xk-unsplash 1.png';
import strawberry from '../assets/Rectangle 53.png';
import pizza from '../assets/Rectangle 54.png';
import sweets from '../assets/Rectangle 55.png';
import tarlan from '../assets/Tarlan.png';
import denis from '../assets/den.jpg';
import vegetables from '../assets/vegetables.png';
import kitchenSoup from '../assets/soupKitchen.png';
import grill from '../assets/grilMeat.png';
import veget from '../assets/veget.png';

type MockElT = {
    img: string,
    name: string,
    description: string,
    available_time: string,
    distance: string
}
export type MockTeamArr = {
    img: string
    name: string
    exp: string
    about: string
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
    },
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
    },
]
export const teamMockArray: Array<MockTeamArr> = [
    {
        name: 'Tarlan',
        img: tarlan,
        exp: "Founder & CEO",
        about: "Former founder of IT Computers, Dev Ops, webdev, mobile dev, 17+ years of experience in IT industry. BCS Auckland, New Zealand, BEc Rybinsk, Russia\n" +
            "\n"
    },
    {
        name: 'Denis',
        img: denis,
        exp: "Frontend Engineer",
        about: "React frontend engineer. 1 year in development. Belarusian State Agrarian University"
    },
    {
        name: 'Stanislav',
        img: denis,
        exp: "Frontend Engineer",
        about: "React frontend engineer. 1 year in development. Belarusian State University of Physical culture and Sport in Minsk. "
    },
    {
        name: 'Tarlan',
        img: tarlan,
        exp: "Founder & CEO",
        about: "Former founder of IT Computers, Dev Ops, webdev, mobile dev, 17+ years of experience in IT industry. BCS Auckland, New Zealand, BEc Rybinsk, Russia\n" +
            "\n"
    },
    {
        name: 'Tarlan',
        img: tarlan,
        exp: "Founder & CEO",
        about: "Former founder of IT Computers, Dev Ops, webdev, mobile dev, 17+ years of experience in IT industry. BCS Auckland, New Zealand, BEc Rybinsk, Russia\n" +
            "\n"
    },
    {
        name: 'Tarlan',
        img: tarlan,
        exp: "Founder & CEO",
        about: "Former founder of IT Computers, Dev Ops, webdev, mobile dev, 17+ years of experience in IT industry. BCS Auckland, New Zealand, BEc Rybinsk, Russia\n" +
            "\n"
    },
    {
        name: 'Tarlan',
        img: tarlan,
        exp: "Founder & CEO",
        about: "Former founder of IT Computers, Dev Ops, webdev, mobile dev, 17+ years of experience in IT industry. BCS Auckland, New Zealand, BEc Rybinsk, Russia\n" +
            "\n"
    },
]
export const property = {
    imageUrl: 'https://bit.ly/2Z4KKcF',
    imageAlt: 'Rear view of modern home with pool',
    name: "@Localgiver123",
    numbLikes: 4,
    about: 'After going through my pantry I realized that I had extra’s that I’d like to giveaway. I currently have chicken noodle, veggie, and clam chowder available.',
    pickUpAddress: '555 North Star Ln\n' +
        'Los Angeles, CA 90210',
    available: "4-6pm",
    rating: 4,
    distance: "7 mi away",
    type: 'Canned Food', reviews: "1,000", quantity: 5
}
export const asideProdProperty = [
    {
        img: pizza,
        name: "Forza Storico",
        about: "2 containers of cooked Vongole pasta (19oz each)",
        available: "9 - 11pm",
        distance: "10mi"
    },
    {
        img: pizza,
        name: "Forza Storico",
        about: "2 containers of cooked Vongole pasta (19oz each)",
        available: "9 - 11pm",
        distance: "10mi"
    },
    {
        img: pizza,
        name: "Forza Storico",
        about: "2 containers of cooked Vongole pasta (19oz each)",
        available: "9 - 11pm",
        distance: "10mi"
    },

];
export const opportunities = [
    {
        img: vegetables,
        name: "@Freddiegives",
        about: "5 bags of fresh fruit and vegetables: include apples, lemons, lettuce, bell peppers.",
    },
    {
        img: grill,
        name: "Grillin’ Meat",
        about: "Needing help to cook burgers for a foodshare festival",
    },
    {
        img: kitchenSoup,
        name: "@Localgiver93",
        about: "I need some help to give out these canned goods to those in need!!!!",
    },
    {
        img: veget,
        name: "Forza Storico",
        about: "2 containers of pizza",
    },
    {
        img: vegetables,
        name: "@Freddiegives",
        about: "5 bags of fresh fruit and vegetables: include apples, lemons, lettuce, bell peppers.",
    },
    {
        img: grill,
        name: "Grillin’ Meat",
        about: "Needing help to cook burgers for a foodshare festival",
    },
    {
        img: kitchenSoup,
        name: "@Localgiver93",
        about: "I need some help to give out these canned goods to those in need!!!!",
    },
    {
        img: pizza,
        name: "Forza Storico",
        about: "2 containers of pizza",
    },

];
export const commentsArray = [
    {
        img: tarlan,
        name: "Tarlan",
        rating: "3 stars",
        comment: "he is a great man!!! he is a great man!!! he is a great man!!! he is a great man!!!",
        date: `${new Date().getFullYear()}/${new Date().getMonth() + 1}/${new Date().getDate()} `
    },
    {
        img: denis,
        name: "Denis",
        rating: "4 stars",
        comment: "Yes, i know it)))!!! Yes, i know it)))!!! Yes, i know it)))!!! Yes, i know it)))!!!",
        date: new Date().getDay()
    },
    {
        img: denis,
        name: "Denis",
        rating: "4 stars",
        comment: "Yes, i know it)))!!! Yes, i know it)))!!! Yes, i know it)))!!! Yes, i know it)))!!!",
        date: new Date().getDay()
    },
]


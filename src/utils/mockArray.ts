import pizza from '../assets/Rectangle 54.png';
import tarlan from '../assets/Tarlan.png';
import denis from '../assets/den.jpg';
import stanislav from '../assets/stanislav.png';
import telman from '../assets/telman.png';
import pitman from '../assets/pitman.png';
import pavel from '../assets/pavel.png';
import nikita from '../assets/nikita.png';
import vegetables from '../assets/vegetables.png';
import kitchenSoup from '../assets/soupKitchen.png';
import grill from '../assets/grilMeat.png';
import veget from '../assets/veget.png';

export type MockTeamArr = {
    img: string
    name: string
    exp: string
    about: string
};

export const teamMockArray: Array<MockTeamArr> = [
    {
        name: 'Tarlan Isaev',
        img: tarlan,
        exp: "Founder & CEO",
        about: "Former founder of IT Computers, Dev Ops, webdev, mobile dev, 17+ years of experience in IT industry. BCS Auckland, New Zealand, BEc Rybinsk, Russia"
    },
    {
        name: 'Denis Yarmoshko',
        img: denis,
        exp: "Frontend Engineer",
        about: "React frontend engineer. 1 year in development. Belarusian State Agrarian University"
    },
    {
        name: 'Stanislav Lisovskii',
        img: stanislav,
        exp: "Frontend Engineer",
        about: "React frontend engineer. 1 year in development. Belarusian State University of Physical culture and Sport in Minsk. "
    },
    {
        name: 'Telman Isaev',
        img: telman,
        exp: "Software tester",
        about: "CEO of IT Computers. Hardware repair,12+ years of experience in IT industry."
    },
    {
        name: 'Pavel Maslov',
        img: pavel,
        exp: "UI/UX Designer",
        about: "15+ years of experience in UI/UX design. Working with leading companies, has completed more than 500 projects in 12 years."
    },
    {
        name: 'Daniel Pitman',
        img: pitman,
        exp: "Food & Bio Expert",
        about: "Fascinated by microbiology and marine life since his youth. Studied a broad degree of biology with major in Marine Sciences and Ecology in Auckland, New Zealand."
    },
    {
        name: 'Nikita Pivovarchik ',
        img: nikita,
        exp: "Backend Engineer",
        about: "Python Backend engineer, 1 year in development.Student at Belarusian State Technological University in Minsk, Belarus."
    }
];

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



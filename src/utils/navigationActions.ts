import food from "../assets/food.svg";
import foodRed from "../assets/foodRed.svg";
import things from "../assets/things.svg";
import thingsRed from "../assets/thingsRed.svg";
import borrow from "../assets/borrow.svg";
import borrowRed from "../assets/borrowRed.svg";
import wanted from "../assets/wanted.svg";
import wantedRed from "../assets/wantedRed.svg";
import foodBanks from "../assets/foodBanks.svg";
import foodBanksRed from "../assets/foodBanksRed.svg";
import fridges from "../assets/fridges.svg";
import fridgesRed from "../assets/fridgesRed.svg";
import business from "../assets/business.svg";
import businessRed from "../assets/businessRed.svg";
import volunteer from "../assets/volunteer.svg";
import volunteerRed from "../assets/volunteerRed.svg";
import challenges from "../assets/challenges.svg";
import challengesRed from "../assets/challengesRed.svg";
import community from "../assets/community.svg";
import communityRed from "../assets/communityRed.svg";
import map from "../assets/mapGray.svg";
import mapRed from "../assets/mapRed.svg";
import veganFood from "../assets/Group.svg";
import socFoodB from "../assets/socFoodb.svg";
import merchandise from "../assets/Vector.svg";

type NavigationActionsSVGType = {
    name: string
    [key: string]: string
    src: string
    red: string
}
export const photoObj ={
    "food":food,
    "things":things,
    "borrow":borrow,
    "wanted":wanted,
    "foodBanks":foodBanks,
    "fridges":fridges,
    "business":business,
    "volunteer":volunteer,
    "challenges":challenges,
    "community":community,
    "merchandise":merchandise,
    "veganFood":veganFood,
    "socFoodB":socFoodB
}
export const navigationActionsSVG: Array<NavigationActionsSVGType> = [
    {
        name: 'Food',
        "en": 'Food',
        "ru": 'Еда',
        "fr": 'Nourriture',
        "cs": 'Jídlo',
        src: food,
        red: foodRed
    },
    {
        name: 'Things',
        "en": 'Things',
        "ru": 'Вещи',
        "fr": 'Des choses',
        "cs": 'Věci',
        src: things,
        red: thingsRed
    },
    {
        name: 'Borrow',
        "en": 'Borrow',
        "ru": 'Одолжить',
        "fr": 'Emprunter',
        "cs": 'Půjčit si',
        src: borrow,
        red: borrowRed
    },
    {
        name: 'Wanted',
        "en": 'Wanted',
        "ru": 'В розыске',
        "fr": 'Voulait',
        "cs": 'Hledaný',
        src: wanted,
        red: wantedRed
    },
    {
        name: 'FoodBanks',
        "en": 'FoodBanks',
        "ru": 'FoodBanks',
        "fr": 'Banques alimentaires',
        "cs": 'FoodBanks',
        src: foodBanks,
        red: foodBanksRed
    },
    {
        name: 'Fridges',
        "en": 'Fridges',
        "ru": 'Холодильники',
        "fr": 'Réfrigérateurs',
        "cs": 'Lednice',
        src: fridges,
        red: fridgesRed
    },
    {
        name: 'Business',
        "en": 'Business',
        "ru": 'Бизнес',
        "fr": 'Affaires',
        "cs": 'Podnikání',
        src: business,
        red: businessRed
    },
    {
        name: 'Volunteer',
        "en": 'Volunteer',
        "ru": 'Волонтеры',
        "fr": 'Bénévole',
        "cs": 'Dobrovolník',
        src: volunteer,
        red: volunteerRed
    },
    {
        name: 'Challenges',
        "en": 'Challenges',
        "ru": 'Вызовы',
        "fr": 'Défis',
        "cs": 'Výzvy',
        src: challenges,
        red: challengesRed
    },
    {
        name: 'Community',
        "en": 'Community',
        "ru": 'Сообщество',
        "fr": 'Communauté',
        "cs": 'Společenství',
        src: community,
        red: communityRed
    },
    {
        name: 'Map',
        "en": 'Map',
        "ru": 'Карта',
        "fr": 'Carte',
        "cs": 'Mapa',
        src: map,
        red: mapRed
    }
]
export const responsive = {
    0: {
        items: 4,
        itemsFit: 'contain',
    },
    450: {
        items: 4,
        itemsFit: 'contain',
    }, 550: {
        items: 6,
        itemsFit: 'contain',
    },
    600: {
        items: 6,
        itemsFit: 'contain',
    },
    620: {
        items: 6,
        itemsFit: 'contain',
    },
    680: {
        items: 7,
        itemsFit: 'contain',
    },
    900: {
        items: 9,
        itemsFit: 'contain',
    },
    1024: {
        items: 11,
        itemsFit: 'contain',
    }
}

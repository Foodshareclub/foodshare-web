import food from "../assets/food.svg";
import things from "../assets/things.svg";
import borrow from "../assets/borrow.svg";
import wanted from "../assets/wanted.svg";
import foodBanks from "../assets/foodBanks.svg";
import fridges from "../assets/fridges.svg";
import business from "../assets/business.svg";
import volunteer from "../assets/volunteer.svg";
import challenges from "../assets/challenges.svg";
import community from "../assets/community.svg";
import map from "../assets/map.svg";

type NavigationActionsT = {
    name: string,
    src: string
}

export const navigationActions: Array<NavigationActionsT> = [
    {
        name: 'Food',
        src: food
    },
    {
        name: 'Things',
        src: things
    },
    {
        name: 'Borrow',
        src: borrow
    },
    {
        name: 'Wanted',
        src: wanted
    },
    {
        name: 'FoodBanks',
        src: foodBanks
    },
    {
        name: 'Fridges',
        src: fridges
    },
    {
        name: 'Business',
        src: business
    },
    {
        name: 'Volunteer',
        src: volunteer
    },
    {
        name: 'Challenges',
        src: challenges
    },
    {
        name: 'Community',
        src: community
    },
    {
        name: 'Map',
        src: map
    }
]

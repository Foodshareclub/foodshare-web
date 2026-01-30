import food from "../assets/food.svg";
import foodRed from "../assets/foodRed.svg";
import things from "../assets/grayBear.png";
import thingsRed from "../assets/thingsRed.png";
import borrow from "../assets/borrow.svg";
import borrowRed from "../assets/borrowRed.svg";
import wanted from "../assets/wanted.svg";
import wantedRed from "../assets/wantedRed.svg";
import foodBanks from "../assets/foodbanks.svg";
import foodBanksRed from "../assets/foodbanksRed.svg";
import fridges from "../assets/fridges.svg";
import fridgesRed from "../assets/fridgesRed.svg";
import business from "../assets/businesses.svg";
import businessRed from "../assets/businessesRed.svg";
import volunteer from "../assets/volunteers.svg";
import volunteerRed from "../assets/volunteersRed.svg";
import challenges from "../assets/challenges.png";
import challengesRed from "../assets/challengesRed.png";
import community from "../assets/community.svg";
import communityRed from "../assets/communityRed.svg";
import zerowaste from "../assets/zerowaste.png";
import zerowasteRed from "../assets/zerowasteRed.png";
import vegan from "../assets/govegan.png";
import veganRed from "../assets/govegan.png";
import socFoodB from "../assets/community.png";

export type NavigationActionsSVGType = {
  name: string;
  nameForUrl: string;
  [key: string]: string;
  src: string;
  red: string;
};
export const photoObj = {
  food: food,
  things: things,
  borrow: borrow,
  wanted: wanted,
  foodBanks: foodBanks,
  fridge: fridges,
  business: business,
  volunteer: volunteer,
  challenges: challenges,
  forum: community,
  vegan: vegan,
  socFoodB: socFoodB,
  "zero waste": zerowaste,
};
export const navigationActionsSVG: Array<NavigationActionsSVGType> = [
  {
    name: "Food",
    nameForUrl: "Food",
    en: "Food",
    ru: "Еда",
    fr: "Nourriture",
    cs: "Jídlo",
    src: food.src,
    red: foodRed.src,
  },
  {
    name: "Things",
    nameForUrl: "Things",
    en: "Things",
    ru: "Вещи",
    fr: "Des choses",
    cs: "Věci",
    src: things.src,
    red: thingsRed.src,
  },
  {
    name: "Borrow",
    nameForUrl: "Borrow",
    en: "Borrow",
    ru: "Одолжить",
    fr: "Emprunter",
    cs: "Půjčit si",
    src: borrow.src,
    red: borrowRed.src,
  },
  {
    name: "Wanted",
    nameForUrl: "Wanted",
    en: "Wanted",
    ru: "В розыске",
    fr: "Voulait",
    cs: "Hledaný",
    src: wanted.src,
    red: wantedRed.src,
  },
  {
    name: "FoodBanks",
    nameForUrl: "FoodBanks",
    en: "FoodBanks",
    ru: "FoodBanks",
    fr: "Banques alimentaires",
    cs: "FoodBanks",
    src: foodBanks.src,
    red: foodBanksRed.src,
  },
  {
    name: "Fridges",
    nameForUrl: "Fridges",
    en: "Fridge",
    ru: "Холодильники",
    fr: "Réfrigérateurs",
    cs: "Lednice",
    src: fridges.src,
    red: fridgesRed.src,
  },
  {
    name: "Organisations",
    nameForUrl: "Organisations",
    en: "Organisations",
    ru: "Организации",
    fr: "Organisations",
    cs: "Organizace",
    src: business.src,
    red: businessRed.src,
  },
  {
    name: "Volunteer",
    nameForUrl: "Volunteer",
    en: "Volunteer",
    ru: "Волонтеры",
    fr: "Bénévole",
    cs: "Dobrovolník",
    src: volunteer.src,
    red: volunteerRed.src,
  },
  {
    name: "Challenges",
    nameForUrl: "Challenges",
    en: "Challenges",
    ru: "Вызовы",
    fr: "Défis",
    cs: "Výzvy",
    src: challenges.src,
    red: challengesRed.src,
  },
  {
    name: "Forum",
    nameForUrl: "Forum",
    en: "Forum",
    ru: "Форум",
    fr: "Forum",
    cs: "Fórum",
    src: community.src,
    red: communityRed.src,
  },
  {
    name: "Zerowaste",
    nameForUrl: "Zerowaste",
    en: "Zero waste",
    ru: "Карта",
    fr: "Carte",
    cs: "Mapa",
    src: zerowaste.src,
    red: zerowasteRed.src,
  },
  {
    name: "Vegan",
    nameForUrl: "Vegan",
    en: "Vegan",
    ru: "Веган",
    fr: "Végétalien",
    cs: "Vegan",
    src: vegan.src,
    red: veganRed.src,
  },
];
export const responsive = {
  0: {
    items: 4,
    itemsFit: "contain",
  },
  450: {
    items: 4,
    itemsFit: "contain",
  },
  550: {
    items: 6,
    itemsFit: "contain",
  },
  600: {
    items: 6,
    itemsFit: "contain",
  },
  620: {
    items: 6,
    itemsFit: "contain",
  },
  680: {
    items: 7,
    itemsFit: "contain",
  },
  900: {
    items: 9,
    itemsFit: "contain",
  },
  1024: {
    items: 10,
    itemsFit: "contain",
  },
};

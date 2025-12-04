import foodRed from "../assets/foodRed.svg";
import thingsRed from "../assets/thingsRed.png";
import borrowRed from "../assets/borrowRed.svg";
import wantedRed from "../assets/wantedRed.svg";
import fridgesRed from "../assets/fridgesRed.svg";
import foodBanksRed from "../assets/foodbanksRed.svg";

type N = Record<string, string>;

export const navigatePhotosObject: N = {
  food: foodRed.src,
  things: thingsRed.src,
  borrow: borrowRed.src,
  wanted: wantedRed.src,
  fridges: fridgesRed.src,
  business: foodBanksRed.src,
  foodbanks: foodBanksRed.src,
};

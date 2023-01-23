import foodRed from "../assets/foodRed.svg";
import thingsRed from "../assets/thingsRed.svg";
import borrowRed from "../assets/borrowRed.svg";
import wantedRed from "../assets/wantedRed.svg";
import fridgesRed from "../assets/fridgesRed.svg";
import foodBanksRed from "../assets/foodBanksRed.svg";

type N = {
    [key: string]: string
}

export const navigatePhotosObject: N = {
    'food': foodRed,
    'things': thingsRed,
    'borrow': borrowRed,
    'wanted': wantedRed,
    'fridges': fridgesRed,
    'business': foodBanksRed,
    'foodbanks':foodBanksRed
}
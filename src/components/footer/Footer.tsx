import React from 'react';
import styles from "./footer.module.scss";
import map from "../../assets/map.svg";
import twitter from "../../assets/twiter.svg";
import insta from "../../assets/instagram.svg";
import facebook from "../../assets/facebook.svg";
import {NavLink} from "react-router-dom";
import {CardFooter} from "@chakra-ui/react";

const Footer = () => {
    return (
        <CardFooter className={styles.root} >
            <div className={styles.club}>© 2022
                Foodshare Club, Limited
            </div>
            <div className={styles.privacy}><p>Privacy</p><p>Terms</p><p>Sitemap</p></div>
            <div className={styles.map}><img src={map} alt="map"/> <div>English</div></div>
            <div className={styles.socseti}>
                <NavLink to={"#"}><img src={twitter} alt="twitter"/></NavLink>
                <NavLink to={"#"}><img src={insta} alt="insta"/></NavLink>
                <NavLink to={"#"}><img src={facebook} alt="facebook"/></NavLink>
            </div>
            <div className={styles.support}>Support & Resources</div>
        </CardFooter>
    );
};

export default Footer;
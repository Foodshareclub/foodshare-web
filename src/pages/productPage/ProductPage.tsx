import React from 'react';
import styles from "./productPage.module.scss";
import soup from "../../assets/tomatoSoup.png";
import burger from "../../assets/burgers.png";
import pizza from "../../assets/pizza.png";
import macaroon from "../../assets/macaroons.png";
import likes from "../../assets/likes.svg";
import {Button, Rating} from "@mui/material";

const ProductPage = () => {
    return (
        <div className={styles.root}>
            <div className={styles.block}>
                <div className={styles.img}><img src={soup} alt="soup"/></div>
                <div className={styles.aboutProd}>
                    <div style={{fontWeight: "700", fontSize: "22px", lineHeight: "32px"}}>ProductsUserName</div>
                    <div><img src={likes} alt="likes"/> : 5likes</div>
                    <div
                        style={{display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "16px"}}>
                        <div style={{alignSelf: "center"}}>Rating:</div>
                        <Rating name="half-rating"
                                defaultValue={2.5}
                                precision={0.5}/>
                    </div>
                    <div>
                        <div style={{fontWeight: "700", fontSize: "16px"}}>About product:</div>
                        <div>It is food</div>
                    </div>
                    <div style={{display: 'flex', justifyContent: "space-between"}}>
                        <div style={{fontWeight: "700", fontSize: "16px"}}>Address:</div>
                        <div>Partizanskaya street</div>
                    </div>
                    <div style={{display: 'flex', justifyContent: "space-between"}}>
                        <div style={{fontWeight: "700", fontSize: "16px"}}>Available:</div>
                        <div> 4 - 6 pm</div>
                    </div>
                    <div style={{display: 'flex', justifyContent: "space-between"}}>
                        <div style={{fontWeight: "700", fontSize: "16px"}}>Quantity:</div>
                        <div> 5</div>
                    </div>
                    <div style={{display: 'flex', justifyContent: "space-between"}}>
                        <div style={{fontWeight: "700", fontSize: "16px"}}>Food type:</div>
                        <div>Canned food</div>
                    </div>
                    <Button sx={{marginTop: "22%"}} variant="contained" fullWidth>Request Pick Up</Button>
                </div>
            </div>
            <div className={styles.block}>
                <div>
                    <div style={{fontWeight: "700", fontSize: "16px"}}>Location</div>
                    <iframe style={{border: "none",width:"450px",height:"90%"}}
                            src="https://www.google.com/maps/embed?pb=!1m10!1m8!1m3!1d27766.322249807687!2d30.4071148!3d53.9770381!3m2!1i1024!2i768!4f13.1!5e1!3m2!1sru!2sby!4v1671362093372!5m2!1sru!2sby"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"></iframe>
                </div>
                <div>
                    <div style={{fontWeight: "700", fontSize: "16px"}}>You make also like:</div>
                    <div>
                        <div className={styles.otherFood}>
                            <img width={"40%"} src={burger} alt="soup"/>
                            <div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "14px"}}>Burger</div>
                                </div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div> 4 burgers</div>
                                </div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "14px"}}>Available:</div>
                                    <div> 4 - 6 pm</div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.otherFood}>
                            <img width={"40%"} src={pizza} alt="soup"/>
                            <div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "14px"}}>pizza</div>
                                </div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div> 4 burgers</div>
                                </div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "14px"}}>Available:</div>
                                    <div> 4 - 6 pm</div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.otherFood}>
                            <img width={"40%"} src={macaroon} alt="soup"/>
                            <div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "14px"}}>macaroon</div>
                                </div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div> 4 burgers</div>
                                </div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "14px"}}>Available:</div>
                                    <div> 4 - 6 pm</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProductPage;
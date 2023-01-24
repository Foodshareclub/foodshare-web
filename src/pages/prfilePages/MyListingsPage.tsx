import React, {useEffect} from 'react';
import {Box, Flex, Heading} from "@chakra-ui/react";
import PersonCard from "../personCard/PersonCard";
import AsideProducts from "../productPage/asideProducts/AsideProducts";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {Trans} from "@lingui/macro";
import {deleteProductTC, getCurrentUserProductsTC} from "../../store/slices/productReducer";
import {Navigate} from "react-router-dom";
import useMediaQuery from "../../utils/useMediaQuery";

type MyListingsPageType = {
    userID: string
}

const MyListingsPage: React.FC<MyListingsPageType> = ({userID}) => {
    const dispatch = useAppDispatch();

    const user = useAppSelector(state => state.user);
    const currentUserProducts = useAppSelector(state => state.product.currentUserProducts);
    const update = useAppSelector(state => state.product.isUpdatedProductsList);
    const isAuth = useAppSelector(state => state.user.isAuth);
    const isSmallerThan1000 = useMediaQuery('(min-width:1000px)');

    useEffect(() => {
        dispatch(getCurrentUserProductsTC(userID))
    }, [update]);

    const deleteProductHandler = async (productID: number) => dispatch(deleteProductTC(productID));

    if (!isAuth) {
        return <Navigate to={'/'}/>
    }

    return (
        <Box mt="18vh">
            <Heading
                textAlign={"center"}
            >
                <Trans>Active Listings</Trans>
            </Heading>
            <Flex mt={5} direction={!isSmallerThan1000 ? "column" : "row"} justify="space-between">
                <Box w={!isSmallerThan1000 ? "100%" : "45%"}>
                    <PersonCard
                        aboutMe={user.value.about_me}
                        exp={"experience"}
                        img={user.imgUrl}
                        name={user.session.user.user_metadata.firstName}
                        secondName={user.session.user.user_metadata.lastName}
                        userID={user.value.id}
                    />
                </Box>
                <Box w={!isSmallerThan1000 ? "100%" : "45%"}>
                    {currentUserProducts.length > 0 && currentUserProducts.map((item, id) => (
                        <AsideProducts
                            key={id}
                            img={item.gif_url}
                            name={item.post_name}
                            about={item.post_description}
                            available={item.pickup_time}
                            distance={item.post_address}
                            product={item}
                            height="25%"
                            deleteProductHandler={deleteProductHandler}
                        />
                    ))}
                </Box>
            </Flex>
        </Box>

    );
};

export default MyListingsPage;
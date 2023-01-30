import React, {useEffect} from 'react';

import {Box, Flex, Heading, SimpleGrid} from "@chakra-ui/react";

import {Trans} from "@lingui/macro";
import {Navigate} from "react-router-dom";
import {useActionCreators, useAppSelector, useGridSize} from "@/hook";
import {deleteProductTC, getCurrentUserProductsTC, productActions} from "@/store/slices/productReducer";
import ListingPersonCard from "@/components/listingPersonCard/ListingPersonCard";
import {ProductCard, PublishListingModal} from "@/components";
import {
    imgURLSelector,
    isAuthSelector,
    userFirstNameSelector,
    userIdSelector,
    userSecondNameSelector
} from "@/store/slices/userSelectors";

import {
    currentUserProductsSelector,
    isUpdateProductSelector,
    messageProductSelector
} from "@/store/slices/productsSelectors";
import AlertComponent from "@/components/alert/AlertComponent";



const MyListingsPage = () => {
    const gridSize = useGridSize();
    const userId = useAppSelector(userIdSelector);
    const isUpdateProduct = useAppSelector(isUpdateProductSelector);
    const currentUserProducts = useAppSelector(currentUserProductsSelector);
    const isAuth = useAppSelector(isAuthSelector);
    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);
    const imgUrl = useAppSelector(imgURLSelector);

    const productMessage = useAppSelector(messageProductSelector);

    const actions = useActionCreators({getCurrentUserProductsTC, deleteProductTC, ...productActions});

    useEffect(() => {
        if (userId) actions.getCurrentUserProductsTC(userId);
    }, [isUpdateProduct, userId]);



    console.log(isUpdateProduct)
    const deleteProductHandler = (productID: number) => {
        actions.deleteProductTC(productID);
    }
    if (!isAuth) {
        return <Navigate to='/'/>
    }

    return (
        <Box mt="20vh">
            <AlertComponent status={isUpdateProduct} title={productMessage} top={"94%"}/>
            <Flex  direction={"column"} justify="space-between">
                <Box>
                    <ListingPersonCard
                        userFirstName={userFirstName}
                        userSecondName={userSecondName}
                        imgUrl={imgUrl}
                    >
                        <Box pt={5}>
                            <PublishListingModal userID={userId}/>
                        </Box>

                    </ListingPersonCard>
                </Box>
                <Heading my={8} textAlign={"center"}>
                    <Trans>Active Listings</Trans>
                </Heading>

                <SimpleGrid p={8}
                            columns={gridSize}
                            spacing={10}>
                    {
                        currentUserProducts.length > 0
                        && currentUserProducts.map((item, id) => (
                        <ProductCard
                            deleteProductHandler={(productID) => deleteProductHandler(productID)}
                            product={item} key={id}/>
                    ))}
                </SimpleGrid>
            </Flex>
        </Box>

    );
};

export default MyListingsPage;
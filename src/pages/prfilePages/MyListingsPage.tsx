import React, {useEffect} from 'react';
import {Box, Button, Flex, Heading, SimpleGrid, useDisclosure} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import {Navigate} from "react-router-dom";
import {useActionCreators, useAppSelector, useGridSize} from "@/hook";
import {deleteProductTC, getCurrentUserProductsTC, productActions} from "@/store/slices/productReducer";
import {AlertComponent, ListingPersonCards, ProductCard, PublishListingModal} from "@/components";
import {
    avatarURLSelector,
    currentUserProductsSelector,
    isAuthSelector,
    isUpdateProductSelector,
    messageProductSelector,
    userFirstNameSelector,
    userIdSelector,
    userSecondNameSelector,
} from "@/store";
import {updateProductEffectSelector} from "@/store/slices/productsSelectors";


const MyListingsPage = () => {
    const {isOpen, onOpen, onClose} = useDisclosure();

    const userId = useAppSelector(userIdSelector);
    const isUpdateProduct = useAppSelector(isUpdateProductSelector);
    const updateProductEffect = useAppSelector(updateProductEffectSelector);
    const currentUserProducts = useAppSelector(currentUserProductsSelector);
    const isAuth = useAppSelector(isAuthSelector);
    const productMessage = useAppSelector(messageProductSelector);

    const actions = useActionCreators({getCurrentUserProductsTC, deleteProductTC, ...productActions});

    useEffect(() => {
        if (userId) actions.getCurrentUserProductsTC(userId);
    }, [updateProductEffect, userId]);


    if (!isAuth) {
        return <Navigate to='/'/>
    }


    return (
        <Box mt="20vh">
            <AlertComponent
                status={isUpdateProduct}
                title={productMessage}
                top={"94%"}
            />

            <Flex direction={"column"} justify="space-between">
                <Box>
                    <ListingPersonCards>
                        <Flex justify={"center"} pt={5}>
                            <Button  w={"30%"} onClick={() => onOpen()}
                                    background={"#ff2d55"}
                                    _hover={{bg: '#c92040'}}
                                    color="#ffffff"
                                    variant="solid"
                            >
                                <Trans>Add Listing</Trans>
                            </Button>
                            <PublishListingModal onClose={onClose} isOpen={isOpen}/>
                        </Flex>

                    </ListingPersonCards>
                </Box>

                <Heading my={8} textAlign={"center"}>
                    <Trans>Active Listings</Trans>
                </Heading>

                <SimpleGrid p={8}
                            columns={{lg:4,md:3,"ss":2,base:1}}
                            spacing={10}>
                    {
                        currentUserProducts.length > 0
                        && currentUserProducts.map((item, id) => (
                            <ProductCard
                                product={item}
                                key={id}
                            />
                        ))}
                </SimpleGrid>
            </Flex>
        </Box>

    );
};

export default MyListingsPage;
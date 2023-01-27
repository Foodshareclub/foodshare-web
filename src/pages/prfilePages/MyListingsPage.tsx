import React, {useEffect} from 'react';
import {Box, Flex, Heading, SimpleGrid} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import {Navigate} from "react-router-dom";
import {useAppDispatch, useAppSelector} from "@/hook";
import {deleteProductTC, getCurrentUserProductsTC} from "@/store/slices/productReducer";
import ListingPersonCard from "@/components/listingPersonCard/ListingPersonCard";
import {GridSize} from "@/utils/gridSize";
import {ProductCard} from "@/components";


const MyListingsPage = () => {
    const dispatch = useAppDispatch();

    const user = useAppSelector(state => state.user);
    const currentUserProducts = useAppSelector(state => state.product.currentUserProducts);
    const update = useAppSelector(state => state.product.isUpdatedProductsList);
    const isAuth = useAppSelector(state => state.user.isAuth);


    useEffect(() => {
        dispatch(getCurrentUserProductsTC(user.value.id))
    }, [update]);

    const deleteProductHandler = async (productID: number) => dispatch(deleteProductTC(productID));

    if (!isAuth) {
        return <Navigate to={'/'}/>
    }

    return (
        <Box mt="23vh">
            <Flex mt={5} direction={"column"} justify="space-between">
                <Box>
                    <ListingPersonCard
                        img={user.imgUrl}
                        name={user.session.user.user_metadata.firstName}
                        secondName={user.session.user.user_metadata.lastName}
                        userID={user.value.id}
                    />
                </Box>
                <Heading my={8}
                         textAlign={"center"}
                >
                    <Trans>Active Listings</Trans>
                </Heading>

                <SimpleGrid p={8} columns={GridSize()}
                            spacing={10}>
                    {currentUserProducts.length > 0 && currentUserProducts.map((item, id) => (
                        <ProductCard deleteProductHandler={(productID) => deleteProductHandler(productID)}
                                     product={item} key={id}/>
                    ))}
                </SimpleGrid>
            </Flex>
        </Box>

    );
};

export default MyListingsPage;
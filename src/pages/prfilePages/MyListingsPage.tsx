import React, {useEffect} from 'react';
import {Box, Flex, Heading, SimpleGrid, useToast} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import {Navigate} from "react-router-dom";
import {useActionCreators, useAppSelector} from "@/hook";
import {deleteProductTC, getCurrentUserProductsTC, productActions} from "@/store/slices/productReducer";
import ListingPersonCard from "@/components/listingPersonCard/ListingPersonCard";
import {GridSize} from "@/utils/gridSize";
import {ProductCard} from "@/components";


const MyListingsPage = () => {
    const toast = useToast()
    const id = useAppSelector<string>(state => state.user.session.user.id);
    const isUpdateProduct = useAppSelector(state => state.product.isUpdateProduct);

    const actions = useActionCreators({getCurrentUserProductsTC, deleteProductTC,...productActions})
    useEffect(() => {
        actions.getCurrentUserProductsTC(id)
    }, [isUpdateProduct]);

    const currentUserProducts = useAppSelector(state => state.product.currentUserProducts);
    const isAuth = useAppSelector(state => state.user.isAuth);


    if (isUpdateProduct === "successful") {
        toast({
            title: 'Account created.',
            description: "We've created your account for you.",
            status: 'success',
            duration: 9000,
            isClosable: true,
        })
    }
    if (isUpdateProduct === "error") {
        toast({
            title: 'Account not created.',
            description: "You have some problem.",
            status: 'error',
            duration: 9000,
            isClosable: true,
        })
    }
    console.log("MyListingsPage->" )
    console.log(isUpdateProduct)

    const deleteProductHandler = (productID: number) => {
        actions.deleteProductTC(productID);
    }

    if (!isAuth) {
        return <Navigate to={'/'}/>
    }

    return (
        <Box mt="23vh">
            <Flex mt={5} direction={"column"} justify="space-between">
                <Box>
                    <ListingPersonCard

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
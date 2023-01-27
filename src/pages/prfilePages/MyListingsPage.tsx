import React, {useEffect} from 'react';
import {Box, Flex, Heading, SimpleGrid} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import {Navigate} from "react-router-dom";
import {useAppDispatch, useAppSelector} from "@/hook";
import {deleteProductTC, getCurrentUserProductsTC} from "@/store/slices/productReducer";
import {useMediaQuery} from "@/utils";
import {AsideProducts} from "@/pages";
import ListingPersonCard from "@/pages/prfilePages/ListingPersonCard";
import {GridSize} from "@/utils/gridSize";
import {ProductCard} from "@/components";

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
                                 spacing={10} >
                        {currentUserProducts.length > 0 && currentUserProducts.map((item, id) => (
                            <ProductCard product={item} key={id}/>
                            // <AsideProducts
                            //     key={id}
                            //     img={item.gif_url}
                            //     name={item.post_name}
                            //     about={item.post_description}
                            //     available={item.pickup_time}
                            //     distance={item.post_address}
                            //     product={item}
                            //     height="25%"
                            //     deleteProductHandler={deleteProductHandler}
                            // />
                        ))}
                    </SimpleGrid>


            </Flex>
        </Box>

    );
};

export default MyListingsPage;
import React, {useEffect} from 'react';
import {Box, Flex, Heading} from "@chakra-ui/react";
import PersonCard from "../personCard/PersonCard";
import {commentsArray} from "../../utils/mockArray";
import AsideProducts from "../productPage/asideProducts/AsideProducts";
import Comments from "../../components/comments/Comments";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {Trans} from "@lingui/macro";
import {deleteProductTC, getCurrentUserProductsTC} from "../../store/slices/productReducer";
import {Navigate} from "react-router-dom";

type MyListingsPageType = {
    userID: string
}

const MyListingsPage: React.FC<MyListingsPageType> = ({userID}) => {
    const dispatch = useAppDispatch();

    const user = useAppSelector(state => state.user);
    const currentUserProducts = useAppSelector(state => state.product.currentUserProducts);
    const update = useAppSelector(state => state.product.isUpdatedProductsList);
    const isAuth = useAppSelector(state => state.user.isAuth);

    useEffect(() => {
        dispatch(getCurrentUserProductsTC(userID))
    }, [update]);

    const deleteProductHandler = async (productID: number) => dispatch(deleteProductTC(productID));

    if(!isAuth) {
        return <Navigate to={'/'}/>
    }

    return (
        <Flex justify="space-between" mt="25vh">
            <Box w="45%">
                <PersonCard
                    aboutMe={user.value.about_me}
                    exp={"experience"}
                    img={user.imgUrl}
                    name={user.session.user.user_metadata.firstName}
                    secondName={user.session.user.user_metadata.lastName}
                    userID={user.value.id}
                />

                <Heading
                    mt={8}
                    textAlign={"start"}
                >
                    <Trans>Reviews Given</Trans>
                </Heading>

                {commentsArray.map((item, id) => (
                    <Comments
                        key={id}
                        comment={item.comment}
                        date={item.date}
                        img={item.img}
                        name={item.name}
                        rating={item.rating}
                    />
                ))}
            </Box>

            <Box w="45%">
                <Heading
                    textAlign={"start"}
                >
                    <Trans>Active Listings</Trans>
                </Heading>

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
    );
};

export default MyListingsPage;
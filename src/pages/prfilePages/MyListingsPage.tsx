import React, {useEffect, useState} from 'react';
import {Box, Flex, Heading} from "@chakra-ui/react";
import PersonCard from "../personCard/PersonCard";
import {commentsArray} from "../../utils/mockArray";
import AsideProducts from "../productPage/asideProducts/AsideProducts";
import Comments from "../../components/comments/Comments";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";
import {Trans} from "@lingui/macro";
import {deleteProductTC, downloadPostImgFromDBTC, getCurrentUserProductsTC} from "../../store/slices/productReducer";

type MyListingsPageType = {
    userID: string
}

const MyListingsPage: React.FC<MyListingsPageType> = ({userID}) => {
    const dispatch = useAppDispatch();

    const user = useAppSelector(state => state.user);
    const currentUserProducts = useAppSelector(state => state.product.currentUserProducts);

    const update = useAppSelector(state => state.product.isUpdatedProductsList)
const [reversUrl,setReversUrl]=useState('')
    useEffect(() => {
        dispatch(getCurrentUserProductsTC(userID))
        //dispatch(downloadPostImgFromDBTC({dir:`avatars-posts/${userID}`,imgUrl:"*"}))

        // dispatch(downloadPostImgFromDBTC({dir:"avatars-posts",imgUrl:"*"}))
    }, [update]);
    useEffect(() => {
      if(reversUrl)
          //
         dispatch(downloadPostImgFromDBTC({dir:"avatars-posts",imgUrl:reversUrl}))
    }, [reversUrl]);

    const deleteProductHandler = async (productID: number) => dispatch(deleteProductTC(productID));

    return (
        <Flex justify="space-between" mt={6}>
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
                        setReversUrl={setReversUrl}
                    />
                ))}
            </Box>
        </Flex>
    );
};

export default MyListingsPage;
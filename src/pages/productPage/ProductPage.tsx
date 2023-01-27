import React, {useEffect} from 'react';
import {useParams} from "react-router-dom";
import {Box, Flex} from "@chakra-ui/react";
import {Trans} from '@lingui/macro';
import {getRandomProducts} from "@/utils";
import {getOneProductTC} from "@/store/slices/productReducer";
import {useAppDispatch, useAppSelector} from "@/hook";
import {AsideProducts} from "@/pages";
import {OneProduct, ProductsLocation} from "@/components";

type ProductPageType = {
    obj?: any
    buttonValue?: string
}

const ProductPage: React.FC<ProductPageType> = ({buttonValue}) => {
    const params = useParams()

    const dispatch = useAppDispatch();

    const products = useAppSelector(state => state.product.products);
    const oneProduct = useAppSelector(state => state.product.oneProduct);

    useEffect(() => {
        dispatch(getOneProductTC(Number(params.id)));
    }, [params.id]);

    return (
        <Box  p={7} mt="22vh">

            {
                oneProduct?.map((product, id) => {
                    return <OneProduct
                        product={product}
                        buttonValue={buttonValue}
                        key={id}
                    />
                })}

            <Flex
                direction={{md: "row", base: "column"}}
                pt={10}
                justify={"center"}
            >
                <ProductsLocation/>

                <Box w={{md: "40%", base: "100%"}}>
                    <Box pt={{md: "0", base: "5px"}} textAlign={{md: "start", base: "center"}} fontWeight={700}
                         fontSize={20} pb={2}>
                        <Trans>You May Also Like:</Trans>
                    </Box>

                    {
                        products.length
                        && oneProduct?.length
                        && getRandomProducts(products, oneProduct[0])
                            .map((product, id) => (//data - 3 random elem from array
                                <AsideProducts
                                    key={id}
                                    product={product}
                                    img={product.gif_url}
                                    name={product.post_name}
                                    about={product.post_description}
                                    available={product.pickup_time}
                                    distance={product.post_address}
                                />
                            ))}

                </Box>
            </Flex>
        </Box>
    );
};

export default ProductPage;
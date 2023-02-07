import React, {useEffect} from 'react';
import {useParams} from "react-router-dom";
import {Flex} from "@chakra-ui/react";
import {getOneProductTC} from "@/store/slices/productReducer";
import {useAppDispatch, useAppSelector} from "@/hook";
import {OneProduct, ProductsLocation} from "@/components";

type ProductPageType = {
    obj?: any
    buttonValue?: string
}

const ProductPage: React.FC<ProductPageType> = ({buttonValue}) => {
    const params = useParams();
    const dispatch = useAppDispatch();
    const oneProduct = useAppSelector(state => state.product.oneProduct);
    console.log(params)
    useEffect(() => {
        dispatch(getOneProductTC(Number(params.id)));
    }, [params.id]);

    return (
        <Flex direction={{md: "row", base: "column"}} justify={"space-between"}  px={7} mt="24vh" mb={"12vh"}>
            {
                oneProduct?.map((product, id) => {
                    return <OneProduct
                        product={product}
                        buttonValue={buttonValue}
                        key={id}
                    />
                })}
                <ProductsLocation/>
        </Flex>
    );
};

export default ProductPage;
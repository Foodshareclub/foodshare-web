import React, {useEffect} from 'react';
import {useParams} from "react-router-dom";
import {Flex} from "@chakra-ui/react";
import {useActionCreators, useAppSelector} from "@/hook";
import {OneProductContainer, ProductsLocation} from "@/components";
import {getOneProductTC, oneProductSelector, productActions} from "@/store";

const ProductPage = () => {
    const params = useParams();
    const actions = useActionCreators({getOneProductTC, ...productActions})
    const oneProduct = useAppSelector(oneProductSelector);

    useEffect(() => {
        actions.getOneProductTC(Number(params.id));
        return () => {
            actions.clearOneProductState();
        }
    }, [params.id]);

    return (
        <Flex direction={{md: "row", base: "column"}} justify={"space-between"} px={{xl: 20, base: 7}} mt="19vh"
              pb={"8vh"}
        >
            {oneProduct && <OneProductContainer
                product={oneProduct}
            />}
            <ProductsLocation/>
        </Flex>
    );
};

export default ProductPage;
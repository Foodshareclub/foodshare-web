import React, {useEffect} from 'react';
import {useParams} from "react-router-dom";
import {Flex} from "@chakra-ui/react";
import {getOneProductTC} from "@/store/slices/productReducer";
import {useActionCreators, useAppSelector} from "@/hook";
import {OneProductContainer, ProductsLocation} from "@/components";
import {oneProductSelector} from "@/store";

const ProductPage = () => {
    const params = useParams();
    const actions = useActionCreators({getOneProductTC})
    const oneProduct = useAppSelector(oneProductSelector);

    useEffect(() => {
        actions.getOneProductTC(Number(params.id));
    }, [params.id]);

    return (
        <Flex direction={{md: "row", base: "column"}} justify={"space-between"} px={7} mt="24vh" mb={"12vh"}>
            {
                oneProduct?.map((product, id) => {
                    return <OneProductContainer
                        buttonValue={"request"}
                        product={product}
                        key={id}
                    />
                })}
            <ProductsLocation/>
        </Flex>
    );
};

export default ProductPage;
import React, {useEffect} from 'react';
import {ProductCard} from "@/components";
import {useParams, useSearchParams} from "react-router-dom";
import {resultsSearchProductsTC} from "@/store/slices/productReducer";
import {useAppDispatch, useAppSelector} from "@/hook";
import {Box, SimpleGrid} from "@chakra-ui/react";
import {GridSize} from "@/utils/gridSize";

export const SearchResultsPage = () => {
    const dispatch = useAppDispatch();

    const params = useParams(); //get params from url
    const [searchParams, setSearchParams] = useSearchParams(); //get params from url
    const keyWord = searchParams.get('key_word');

    useEffect(() => {
        dispatch(resultsSearchProductsTC({
            searchWord: keyWord as string,
            productSearchType: params.type as string
        }));
    }, [params.type, keyWord]);

    const products = useAppSelector(state => state.product.searchProducts);

    return (
        <Box mt="18vh">
            <SimpleGrid
                columns={GridSize()}
                spacing={10}
            >
                {products.map((product) => (
                    <ProductCard
                        product={product}
                        key={product.id}
                    />
                ))}

            </SimpleGrid>
        </Box>
    );
};

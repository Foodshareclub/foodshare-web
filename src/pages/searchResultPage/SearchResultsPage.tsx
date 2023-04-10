import React, {useEffect} from 'react';
import {ProductCard, SkeletonCard} from "@/components";
import {useParams, useSearchParams} from "react-router-dom";
import {useActionCreators, useAppSelector, useGridSize} from "@/hook";
import {Box, Heading, SimpleGrid, Text} from "@chakra-ui/react";
import {productStatusSelector, resultsSearchProductsTC, searchProductsSelector} from "@/store";

export const SearchResultsPage = () => {
    const status = useAppSelector(productStatusSelector);
    const loaded = status === "loaded";
    const gridSize = useGridSize();
    const params = useParams(); //get params from url
    const actions = useActionCreators({resultsSearchProductsTC})
    const [searchParams, setSearchParams] = useSearchParams(); //get params from url
    const keyWord = searchParams.get('key_word');

    useEffect(() => {
        actions.resultsSearchProductsTC({
            searchWord: keyWord as string,
            productSearchType: params.type as string
        });
    }, [params.type, keyWord]);

    const products = useAppSelector(searchProductsSelector);

    return (
        <Box px={{xl: 20, base: 7}} py={7} mt="18vh">
            <SimpleGrid
                columns={gridSize}
                spacing={10}
            >{!loaded ?
                [...Array(3)].map((item, i) => (
                    <SkeletonCard key={i} isLoaded={false}/>
                ))
                : products.length === 0 ?
                    <Heading>Sorry, <Text color={"red.500"}>{keyWord}</Text> not found!</Heading> :
                    products.map((product) => (
                        <ProductCard
                            product={product}
                            key={product.id}
                        />

                    ))
            }
            </SimpleGrid>
        </Box>
    );
};

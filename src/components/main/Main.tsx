import React from 'react';
import {Box, Link, SimpleGrid} from "@chakra-ui/react";
import {ArrowForwardIcon} from "@chakra-ui/icons";
import {Trans} from "@lingui/macro";
import {InitialProductStateType} from "@/store/slices/productReducer";
import {useAppSelector} from "@/hook";

import {GridSize} from "@/utils/gridSize";
import {ProductCard} from "@/components";


export const Main = () => {
    const products = useAppSelector<Array<InitialProductStateType>>(state => state.product.products);

    return (
        <Box mt="18vh">
            {/*<Trans>*/}
            {/*    Last login on {i18n.date(new Date())}.*/}
            {/*</Trans>*/}

            <SimpleGrid
                columns={GridSize()}
                spacing={10}
            >
                {products.map((product, id) => (
                    <ProductCard
                        product={product}
                        key={product.id}
                    />

                ))}

            </SimpleGrid>
            <Box _hover={{bg: 'red.100'}} fontSize={25} textAlign="center" mt={5}>
                <Link href='#'>
                    <Trans>See more...</Trans><ArrowForwardIcon mx={2}/>
                </Link>
            </Box>
        </Box>
    );
}
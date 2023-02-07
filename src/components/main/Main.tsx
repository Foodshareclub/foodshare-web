import React from 'react';
import {Box, Link, SimpleGrid} from "@chakra-ui/react";
import {ArrowForwardIcon} from "@chakra-ui/icons";
import {Trans} from "@lingui/macro";
import {InitialProductStateType} from "@/store/slices/productReducer";
import {useAppSelector} from "@/hook";
import {useGridSize} from "@/hook/useGridSize";
import {ProductCard} from "@/components";
import {productsSelector} from "@/store/slices/productsSelectors";


export const Main = () => {
    const products = useAppSelector<Array<InitialProductStateType>>(productsSelector);
    const gridSize = useGridSize();
    return (
        <Box mt="20vh">
            {/*<Trans>*/}
            {/*    Last login on {i18n.date(new Date())}.*/}
            {/*</Trans>*/}

            <SimpleGrid
                columns={gridSize}
                spacing={10}
               p={7}
            >
                {products.map((product) => (
                    <ProductCard
                        product={product}
                        key={product.id}
                    />

                ))}

            </SimpleGrid>

            <Box  _hover={{bg: 'red.100'}} fontSize={25} textAlign="center" mt={5}>
                <Link href='#'>
                    <Trans>See more...</Trans><ArrowForwardIcon mx={2}/>
                </Link>
            </Box>
        </Box>
    );
}

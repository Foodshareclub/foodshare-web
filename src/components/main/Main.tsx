import React from 'react';
import {Box, SimpleGrid} from "@chakra-ui/react";
import {InitialProductStateType} from "@/store/slices/productReducer";
import {useAppSelector} from "@/hook";
import {useGridSize} from "@/hook/useGridSize";
import {ProductCard} from "@/components";
import {productsSelector, productStatusSelector} from "@/store/slices/productsSelectors";
import SkeletonCard from "@/components/productCard/SkeletonCard";


export const Main = () => {
    const products = useAppSelector<Array<InitialProductStateType>>(productsSelector);
    const status = useAppSelector(productStatusSelector);
    const loaded = status === "loaded";
    const gridSize = useGridSize();

    return (
        <Box mt="20vh" mb={"12vh"}>
            {/*<Trans>*/}
            {/*    Last login on {i18n.date(new Date())}.*/}
            {/*</Trans>*/}

            <SimpleGrid
                columns={gridSize}
                spacing={10}
                p={7}
            >{!loaded?
                [...Array(5)].map((item,i)=>(
                    <SkeletonCard key={i} isLoaded={false}/>
                ))
                :
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
}





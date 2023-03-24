import React, {useRef} from 'react';
import {Box, SimpleGrid} from "@chakra-ui/react";
import {useAppSelector} from "@/hook";
import {useGridSize} from "@/hook/useGridSize";
import {ProductCard} from "@/components";
import {productsSelector, productStatusSelector} from "@/store/slices/productsSelectors";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";


export const Main = () => {
    const products = useAppSelector(productsSelector);
    const filteredProducts = products.filter(products => products.post_published)
    const status = useAppSelector(productStatusSelector);
    const loaded = status === "loaded";
    const gridSize = useGridSize();
    const messagesAnchorRef = useRef<HTMLDivElement>(null);

    return (
        <Box
            ref={messagesAnchorRef} mt="18vh" mb="5vh">
            <NavigateButtons messagesAnchorRef={messagesAnchorRef} title={"Show map"}/>
            {/*<Box ref={messagesAnchorRef}></Box>*/}
            {/*<Trans>*/}
            {/*    Last login on {i18n.date(new Date())}.*/}
            {/*</Trans>*/}
            <SimpleGrid
                columns={gridSize}
                spacing={10}
                px={{xl: 20, base: 7}}
                py={7}
            >{!loaded ?
                [...Array(10)].map((item, i) => (
                    <SkeletonCard key={i} isLoaded={false}/>
                ))
                :
                filteredProducts.map((product) => (
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





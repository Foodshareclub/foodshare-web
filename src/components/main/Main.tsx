import React, {useRef} from 'react';
import {Box, SimpleGrid} from "@chakra-ui/react";
import {useAppSelector, useGridSize} from "@/hook";
import {NavigateButtons, ProductCard, SkeletonCard} from "@/components";
import {geoDistanceSelector, productsSelector, productStatusSelector, userLocationSelector} from "@/store";
import {getDistanceFromLatLonInKm} from "@/utils/getDistanceFromLatLonInKm";

// let radius = 800;
let filteredPosts;
export const Main = () => {
    const products = useAppSelector(productsSelector);
    const radius = useAppSelector(geoDistanceSelector);
    const {_latitude, _longitude} = useAppSelector(userLocationSelector);

    if (radius){filteredPosts = products.filter(post => {
        const distance = getDistanceFromLatLonInKm(_latitude, _longitude, post.locations["_latitude"], post.locations['_longitude']);
         return distance <= radius;
    })}else filteredPosts = products
    const status = useAppSelector(productStatusSelector);
    const loaded = status === "loaded";
    const gridSize = useGridSize();
    const messagesAnchorRef = useRef<HTMLDivElement>(null);
    return (
        <Box
            ref={messagesAnchorRef} mt="18vh" mb="5vh">
            <NavigateButtons messagesAnchorRef={messagesAnchorRef} title={"Show map"}/>
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
                filteredPosts.map((product) => (
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





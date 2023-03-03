import React, {useEffect, useRef, useState} from 'react';
import {Box, IconButton, SimpleGrid} from "@chakra-ui/react";
import {InitialProductStateType} from "@/store/slices/productReducer";
import {useAppSelector} from "@/hook";
import {useGridSize} from "@/hook/useGridSize";
import {ProductCard} from "@/components";
import {productsSelector, productStatusSelector} from "@/store/slices/productsSelectors";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import {ArrowRightIcon} from "@chakra-ui/icons";

export const Main = () => {

    const products = useAppSelector<Array<InitialProductStateType>>(productsSelector);
    const filteredProducts = products.filter(products => products.post_published)
    const status = useAppSelector(productStatusSelector);
    const loaded = status === "loaded";
    const gridSize = useGridSize();
    const messagesAnchorRef = useRef<HTMLDivElement>(null);

    const [scrollTop, setScrollTop] = useState(0);

    const goToStart = () => {
        messagesAnchorRef.current?.scrollIntoView({behavior: 'smooth'});
    }
    useEffect(() => {
        const handleScroll = () => {
            setScrollTop(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <Box
            ref={messagesAnchorRef}
            mt="18vh"
            mb={"5vh"}
        >
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
            <Box display={scrollTop > 400 ? "block" : "none"} textAlign={"end"} bottom={"20%"} w={"100%"}
                 position={"fixed"}>
                <IconButton boxShadow={"dark-lg"} p={2} w={10} h={10} borderRadius={20} transform={"auto"} rotate={270}
                            as={ArrowRightIcon} mr={"10%"} onClick={goToStart} aria-label={"UP"}>UP</IconButton>
            </Box>
        </Box>
    );
}





import * as React from 'react';
import {Box, Button, Flex} from "@chakra-ui/react";
import "../../index.css";
import Carousel from "../carousel/Carousel";
import {PagesType} from "./Header";


type SimpleBottomNavigationType = {
    pageType: PagesType
    setPageType: (pageType: PagesType) => void
    getRoute: (route: string) => void
    productType: string
}
const SimpleBottomNavigation: React.FC<SimpleBottomNavigationType> = ({
                                                                          getRoute,
                                                                          pageType,
                                                                          setPageType,
                                                                          productType
                                                                      }) => {

    return (
        <Box position={"relative"} py={3} px={{xl: 20, base: 7}}>
            <Flex w={'90%'}>
                <Carousel
                    getRoute={getRoute}
                    setPageType={setPageType}
                    pageType={pageType}
                    productType={productType}
                />
                <Button variant={"outline"} right={{xl: 20, base: 7}} position={"absolute"}
                        alignSelf={"center"}>FILTERS</Button>
            </Flex>

        </Box>

    )
}
export default SimpleBottomNavigation
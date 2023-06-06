import * as React from 'react';
import {Box, Flex} from "@chakra-ui/react";
import "../../index.css";
import Carousel from "../carousel/Carousel";
import {PagesType} from "./Header";
import FiltersModal from "@/components/modals/FiltersModal";


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
        <Box
            position={"relative"}
            px={{xl: 20, base: 7}}
            py={3}
        >
            <Flex w={{md: '90%', base: "100%"}}>
                <Carousel
                    getRoute={getRoute}
                    setPageType={setPageType}
                    pageType={pageType}
                    productType={productType}
                />
                <FiltersModal/>
            </Flex>

        </Box>

    )
}
export default SimpleBottomNavigation
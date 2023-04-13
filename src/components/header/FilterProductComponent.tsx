import * as React from 'react';
import {Flex} from "@chakra-ui/react";
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
            <Flex
                py={3}
                px={{xl:20,base:7}}
            >
                <Carousel
                    getRoute={getRoute}
                    setPageType={setPageType}
                    pageType={pageType}
                    productType={productType}
                />
            </Flex>
    )
}
export default SimpleBottomNavigation
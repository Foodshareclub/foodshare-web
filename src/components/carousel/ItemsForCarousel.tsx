import React, {FC} from 'react';
import {Box, Image, Text} from "@chakra-ui/react";
import {NavigationActionsSVGType} from "@/utils/navigationActions";

type ItemsForCarouselType = {
    productType: string
    item: NavigationActionsSVGType
    pageType: string
    navigateHandler: (name: string) => void
    language: string
}

const ItemsForCarousel: FC<ItemsForCarouselType> = ({
                                                        language,
                                                        productType,
                                                        item,
                                                        pageType,
                                                        navigateHandler
                                                    }) => {

    const changeAttributeValue = (v1: any, v2: any) => {
        if ((productType === item.name.toLowerCase()) && pageType === 'productComponent') {
            return v1;
        } else return v2;
    };
    return (
        <Box
            py={1}
            borderBottomWidth={changeAttributeValue(3, 0)}
            borderStyle={'solid'}
            borderColor={'#FF2D55'}
            alignSelf={"center"}
            onClick={() => navigateHandler(item.name)}
            cursor="pointer"
        >
            <Image
                m="0 auto" alignItems="center" src={changeAttributeValue(item.red, item.src)}
                  boxSize={6}
            />
            <Text
                color={changeAttributeValue("#FF2D55", "inherit")}
                noOfLines={1}
                mb={0}
                pb={0}
                textAlign="center"
            >
                {item[language]}
            </Text>
        </Box>
    );
};

export default ItemsForCarousel;
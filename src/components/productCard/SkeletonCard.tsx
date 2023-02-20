import React from 'react';
import {Box, GridItem, Image, Skeleton} from "@chakra-ui/react";

type PropsSkeletonType = {
    isLoaded: boolean
}
const SkeletonCard: React.FC<PropsSkeletonType> = ({isLoaded}) => {
    return (
        <GridItem>
            <Skeleton isLoaded={isLoaded}>
                <Image
                    rounded={'lg'}
                    objectFit={'cover'}
                    width="100%"
                    height={250}
                    cursor="pointer"
                    borderRadius="10px"
                    alt="broken image"
                />
            </Skeleton>
            <Box>
                <Skeleton mt={4} height='20px' isLoaded={isLoaded}/>
                <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
                <Skeleton mt={2} height='20px' isLoaded={isLoaded}/>
            </Box>
        </GridItem>
    );
};

export default SkeletonCard;
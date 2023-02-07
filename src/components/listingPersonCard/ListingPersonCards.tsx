import React, {ReactNode} from 'react';
import {Box, Card, CardBody, Flex, Heading, Image, Stack} from "@chakra-ui/react";
import peak from "@/assets/peakpx-min.jpg";
import AvatarWithRipple from "@/components/listingPersonCard/AvatarWithRipple";

type PropsType = {
    userSecondName: string
    userFirstName: string
    imgUrl: string
    children?: ReactNode
}
const ListingPersonCards: React.FC<PropsType> = ({userSecondName, userFirstName, imgUrl, children}) => {
    return (
        <Box>
            <Image
                h={'200px'}
                w={'full'}
                src={peak}
                objectFit={'cover'}
            />

            <Flex justify={'center'} mt={-12}>
                <AvatarWithRipple img={imgUrl}/>
            </Flex>
            <Stack alignSelf={"center"}>
                <Box>
                    <Heading  textAlign={"center"} size='md'>
                        {userFirstName} {userSecondName}
                    </Heading>
                    {children}
                </Box>
            </Stack>
        </Box>
    );
};

export default ListingPersonCards;
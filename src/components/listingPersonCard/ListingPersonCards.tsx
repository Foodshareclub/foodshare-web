import React, {ReactNode} from 'react';
import {Card, CardBody, Flex, Heading, Image, Stack} from "@chakra-ui/react";
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
        <Card
            direction={"column"}
            overflow='hidden'
            variant="unstyled"
        >
            <Image
                h={'200px'}
                w={'full'}
                src={peak}
                objectFit={'cover'}
            />

            <Flex justify={'center'} mt={-12}>
                <AvatarWithRipple img={imgUrl}/>
                {/*<Avatar*/}
                {/*    size={'xl'}*/}
                {/*    src={imgUrl}*/}
                {/*    boxShadow={'2xl'}*/}
                {/*    css={{*/}
                {/*        border: '2px solid white',*/}
                {/*    }}*/}
                {/*/>*/}
            </Flex>
            <Stack alignSelf={"center"}>
                <CardBody>
                    <Heading textAlign={"center"} size='md'>
                        {userFirstName} {userSecondName}
                    </Heading>
                    {children}
                </CardBody>
            </Stack>
        </Card>
    );
};

export default ListingPersonCards;
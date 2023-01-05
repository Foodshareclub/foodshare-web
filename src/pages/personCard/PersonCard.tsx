import React from 'react';
import {Button, Card, CardBody, Heading, Image, Skeleton, Stack, Text} from "@chakra-ui/react";
import PublishListingModal from "../../components/modals/PublishListingModal";

type PropsType = {
    name: string
    img: string
    exp: string
    aboutExp?: string
    aboutMe?: string
}

const PersonCard: React.FC<PropsType> = ({name, img, exp, aboutExp, aboutMe}) => {
    return (
        <Card
            direction={{base: 'column', sm: 'row'}}
            overflow='hidden'
            variant='filled'
            mt={4} mb={4}
        >
            <Skeleton borderRadius="50%"
                      m={2}
                      isLoaded={true}>
                <Image
                    alignSelf="center"
                    borderRadius="50%"
                    p={4}
                    objectFit='none'
                    maxW={{base: '100%', sm: '200px'}}
                    src={img}
                    alt={img}
                />
            </Skeleton>
            <Stack alignSelf={"center"}>
                <CardBody>
                    <Heading size='md'>{name}</Heading>
                    <Heading size='md'>{exp}</Heading>
                    {aboutMe ? <>
                        <Text py='2'>
                            {aboutMe}
                        </Text>
                        <PublishListingModal/>
                    </> : <Text py='2'>
                        {aboutExp}
                    </Text>}

                </CardBody>
            </Stack>
        </Card>
    );
};

export default PersonCard;
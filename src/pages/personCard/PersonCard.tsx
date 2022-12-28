import React from 'react';
import {Card, CardBody, Heading, Image, Stack, Text} from "@chakra-ui/react";

type PropsType = {
    name: string
    img: string
    exp: string
    about: string
}

const PersonCard: React.FC<PropsType> = ({name, img, exp, about}) => {
    return (
        <Card
            direction={{base: 'column', sm: 'row'}}
            overflow='hidden'
            variant='outline'
            bgColor={"red.100"}
            mt={4} mb={4}
        >
            <Image
                borderRadius="50%"
                p={2}
                objectFit='none'
                maxW={{base: '100%', sm: '200px'}}
                src={img}
                alt={img}
            />

            <Stack>
                <CardBody>
                    <Heading size='md'>{name}</Heading>
                    <Heading size='md'>{exp}</Heading>
                    <Text py='2'>
                        {about}
                    </Text>
                </CardBody>
            </Stack>
        </Card>
    );
};

export default PersonCard;
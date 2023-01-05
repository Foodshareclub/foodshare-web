import React from 'react';
import {Avatar, Card, CardBody, Heading, SkeletonCircle, Stack, Text} from "@chakra-ui/react";
import {StarIcon} from "@chakra-ui/icons";
import {property} from "../../utils/mockArray";

type PropsCommentsType = {
    name: string
    img: string
    rating: number
    comment: string
    date: string | number
}
const Comments: React.FC<PropsCommentsType> = ({date, name, img, rating, comment}) => {
    return (
        <Card
            direction={{base: 'column', sm: 'row'}}
            overflow='hidden'
            variant='outline'
            mt={4} mb={4}
        >
            <Avatar
                ml={2}
                alignSelf="center"
                src={img}
            />
            <Stack alignSelf={"center"}>
                <CardBody>
                    <Heading size='sm'>{name}</Heading>
                    {Array(5)
                        .fill('')
                        .map((_, i) => (
                            <StarIcon
                                key={i}
                                color={i < rating ? 'yellow.500' : 'gray.300'}
                            />
                        ))}
                    <Text size='sm'>{date}</Text>
                    <Text py='2'>
                        {comment}
                    </Text>

                </CardBody>
            </Stack>
        </Card>
    );
};

export default Comments;
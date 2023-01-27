import {InitialProductStateType} from "@/store/slices/productReducer";
import React from "react";
import {Box, Flex, Heading, Image, Text} from "@chakra-ui/react";
import loc from "@/assets/location-blue.svg";
import likes from "@/assets/likes.svg";
import {StarIcon} from "@chakra-ui/icons";
import {Trans} from "@lingui/macro";
import {PickUpRequestModal} from "@/components";

type OneProductType = {
    product: InitialProductStateType
    buttonValue?: string
}

export const OneProduct: React.FC<OneProductType> = ({product, buttonValue}) => {
    return (
        <Flex
            direction={{md: "row", base: "column"}}
            justify="center">
            <Box w={{md: "50%", base: "100%"}} alignSelf="center">
                <Image
                    src={product.gif_url}
                    borderRadius={20}
                    alt={product.post_name}
                    m={"0 auto"}
                    maxWidth={300}
                    height={{ss: "auto", base: "270px"}}
                />
            </Box>

            <Box w={{md: "40%", base: "100%"}}>
                <Box lineHeight={2}>
                    <Heading textTransform={'uppercase'} textAlign={"center"} noOfLines={1} fontSize={'2xl'} fontFamily={'body'}
                             fontWeight={500}>{product.post_name}</Heading>

                    <Flex>
                        <Image src={loc} alt={loc}/>
                        <Text px={2} textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}>{product.post_address}</Text>
                    </Flex>

                    <Flex>
                        <Image src={likes} alt={likes}/>
                        <Text px={2} textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}>{product.post_like_counter}</Text>
                    </Flex>

                    <Flex mt='2' alignItems='center'>
                        {Array(5)
                            .fill('')
                            .map((_, i) => (
                                <StarIcon
                                    key={i}
                                    color={i < 4 ? 'teal.500' : 'gray.300'}
                                />
                            ))}
                        <Box as='span' ml='2' color='gray.600' fontSize='sm'>
                            <Text textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                                  textTransform={'uppercase'}><Trans>{product.post_views} views</Trans></Text>
                        </Box>
                    </Flex>
                    {/*<Heading alignSelf="center" size='md'><Trans>Pick Up Address</Trans></Heading>*/}
                    {/*<Text>{item.post_address}</Text>*/}

                    <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'}
                             alignSelf="center"><Trans>Available:</Trans></Heading>
                    <Text noOfLines={1} color={'gray.500'} fontSize={'sm'}
                          textTransform={'uppercase'}>{product.pickup_time}</Text>

                    <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'}><Trans>Quantity:</Trans></Heading>
                    <Text noOfLines={1} color={'gray.500'} fontSize={'sm'}
                          textTransform={'uppercase'}>{product.post_description}</Text>

                    <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'} alignSelf="center"
                             size='md'><Trans>Food Type:</Trans></Heading>
                    <Text color={'gray.500'} fontSize={'sm'} textTransform={'uppercase'}>{product.post_type}</Text>
                </Box>

                <Box mt={10}>
                    <PickUpRequestModal buttonValue={buttonValue}/>
                </Box>
            </Box>
        </Flex>
    )
}
import React, {useEffect} from 'react';

import likes from "../../assets/likes.svg";
import loc from "../../assets/location-blue.svg";
import {useLocation} from "react-router-dom";
import {Box, Flex, Heading, Image, Text} from "@chakra-ui/react";
import {StarIcon} from "@chakra-ui/icons";
import {Trans} from '@lingui/macro';
import {getRandomProducts, useMediaQuery} from "@/utils";
import {getProductTC, InitialProductStateType, productActions} from "@/store/slices/productReducer";
import {useActionCreators, useAppSelector} from "@/hook";
import {PickUpRequestModal} from "@/components";
import {AsideProducts} from "@/pages";

type ProductPageType = {
    obj?: any
    buttonValue?: string
}

const ProductPage: React.FC<ProductPageType> = ({buttonValue}) => {

    const allActions = {...productActions, getProductTC}

    const isSmallerThan768 = useMediaQuery('(min-width:768px)');
    const item: InitialProductStateType = useLocation().state;
    const products = useAppSelector<Array<InitialProductStateType>>(state => state.product.products);
    const actions = useActionCreators(allActions)
    useEffect(() => {
        actions.getProductTC(item.post_type)
    }, []);


    return (
        <Box mt="22vh">
            <Flex
                direction={{md: "row", base: "column"}}
                justify="center">
                <Box w={{md: "50%", base: "100%"}} alignSelf="center">
                    <Image
                        src={item.gif_url}
                        borderRadius={20}
                        alt={item.post_name}
                        m={"0 auto"}
                        maxWidth={300}
                        height={{ss: "auto", base: "270px"}}
                    />
                </Box>

                <Box w={{md: "40%", base: "100%"}}>
                    <Box lineHeight={2}>
                        <Heading textAlign={"center"} noOfLines={1} fontSize={'2xl'} fontFamily={'body'}
                                 fontWeight={500}>{item.post_name}</Heading>

                        <Flex>
                            <Image src={loc} alt={loc}/>
                            <Text px={2} textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                                  textTransform={'uppercase'}>{item.post_address}</Text>
                        </Flex>

                        <Flex>
                            <Image src={likes} alt={likes}/>
                            <Text px={2} textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'}
                                  textTransform={'uppercase'}>{item.post_like_counter}</Text>
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
                                      textTransform={'uppercase'}><Trans>{item.post_views} views</Trans></Text>
                            </Box>
                        </Flex>
                        {/*<Heading alignSelf="center" size='md'><Trans>Pick Up Address</Trans></Heading>*/}
                        {/*<Text>{item.post_address}</Text>*/}

                        <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'}
                                 alignSelf="center"><Trans>Available:</Trans></Heading>
                        <Text noOfLines={1} color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}>{item.pickup_time}</Text>

                        <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'}><Trans>Quantity:</Trans></Heading>
                        <Text noOfLines={1} color={'gray.500'} fontSize={'sm'}
                              textTransform={'uppercase'}>{item.post_description}</Text>

                        <Heading fontFamily={'body'} fontWeight={500} fontSize={'xl'} alignSelf="center"
                                 size='md'><Trans>Food Type:</Trans></Heading>
                        <Text color={'gray.500'} fontSize={'sm'} textTransform={'uppercase'}>{item.post_type}</Text>
                    </Box>

                    <Box mt={10}>
                        <PickUpRequestModal buttonValue={buttonValue}/>
                    </Box>
                </Box>
            </Flex>

            <Flex
                direction={{md: "row", base: "column"}}
                pt={10}
                justify={"center"}
            >
                <Box borderRadius={10} alignSelf={"start"} w={{md: "50%", base: "100%"}}>
                    <Box fontWeight={700} fontSize={20} pb={6}>
                        <Trans>Location:</Trans>
                    </Box>

                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d2417628.5557509!2d27.986708999999998!3d53.718878999999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sru!2sby!4v1671868201476!5m2!1sru!2sby"
                        width={isSmallerThan768 ? "90%" : "100%"} height="500"
                        style={{border: "0", borderRadius: "10px"}} loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"></iframe>
                </Box>

                <Box w={{md: "40%", base: "100%"}}>
                    <Box pt={{md: "0", base: "5px"}} textAlign={{md: "start", base: "center"}} fontWeight={700}
                         fontSize={20} pb={2}>
                        <Trans>You May Also Like:</Trans>
                    </Box>

                    {products.length && getRandomProducts(products, item).map((product, id) => (//data - 3 random elem from array
                        <AsideProducts
                            key={id}
                            product={product}
                            img={product.gif_url}
                            name={product.post_name}
                            about={product.post_description}
                            available={product.pickup_time}
                            distance={product.post_address}
                        />
                    ))}

                </Box>
            </Flex>
        </Box>
    );
};

export default ProductPage;
import React from 'react';
import {Box, Flex, Heading, Input, InputGroup, InputLeftElement, Link, SimpleGrid, Stack} from "@chakra-ui/react";
import {ArrowForwardIcon, SearchIcon} from "@chakra-ui/icons";
import {t, Trans} from "@lingui/macro";
import {InitialProductStateType} from "@/store/slices/productReducer";
import {useAppSelector} from "@/hook";
import {useGridSize} from "@/hook/useGridSize";
import {MinifiedUserInfo, ProductCard} from "@/components";
import {productsSelector} from "@/store/slices/productsSelectors";
import {avatarURLSelector, userFirstNameSelector, userSecondNameSelector} from "@/store";
import AvatarWithRipple from "@/components/listingPersonCard/AvatarWithRipple";


export const Main = () => {
    const products = useAppSelector<Array<InitialProductStateType>>(productsSelector);
    const gridSize = useGridSize();
    return (
        <Box mt="20vh">
            {/*<Trans>*/}
            {/*    Last login on {i18n.date(new Date())}.*/}
            {/*</Trans>*/}

            <SimpleGrid
                columns={gridSize}
                spacing={10}
                p={7}
            >
                {products.map((product) => (
                    <ProductCard
                        product={product}
                        key={product.id}
                    />

                ))}

            </SimpleGrid>


            <ContactsBlock/>


            <Box _hover={{bg: 'red.100'}} fontSize={25} textAlign="center" mt={5}>
                <Link href='#'>
                    <Trans>See more...</Trans><ArrowForwardIcon mx={2}/>
                </Link>
            </Box>


        </Box>
    );
}


const ContactsBlock = () => {
    const imgUrl = useAppSelector(avatarURLSelector);
    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);

    return (
        <>
            <AvatarWithRipple img={imgUrl}/>
            <Stack alignSelf={"center"}>
                <Box>
                    <Heading textAlign={"center"} size='md'>
                        {userFirstName} {userSecondName}
                    </Heading>
                </Box>

                <InputGroup alignSelf="center" w={"30%"} alignItems="center" flexDir="column">
                    <InputLeftElement
                        pointerEvents={"stroke"}
                        children={<SearchIcon
                            // cursor={showSearchParams ? "pointer" : ""}
                            // color={showSearchParams ? 'red.500' : 'gray.300'}
                            // onClick={onFindResultsHandler}
                        />}
                    />
                    <Input
                        // focusBorderColor='#FF2D55'
                        // value={searchValue}
                        // onChange={onSearchHandler}
                        // onFocus={() => setShowSearchParams(true)}
                        placeholder={t({
                            id: `msg.Input`,
                            message: `What are we in search of today?`
                        })}
                    />
                </InputGroup>


                <Flex alignSelf="center">
                    <MinifiedUserInfo
                        src={imgUrl}
                        description={'SOME PRODUCT NAME'}
                        firstName={'fNAME'}
                        secondName={'sName'}
                    />
                </Flex>

            </Stack>
        </>
    )
}


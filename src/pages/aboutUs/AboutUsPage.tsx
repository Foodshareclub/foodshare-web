import React, {useEffect, useState} from 'react';
import {Box, Grid, GridItem, Image, Link, SimpleGrid, Skeleton} from "@chakra-ui/react";
import kitchen from "../../assets/Foodies Soup Kitchen.png";
import PersonCard from "../personCard/PersonCard";
import {teamMockArray} from "../../utils/mockArray";
import leftImg from "../../assets/leftImg.png";
import centerTop from "../../assets/centerTop.png";
import centerBottom from "../../assets/centerBott.png";
import rightImg from "../../assets/rightImg.png";
import company from "../../assets/AvoAcademy.png";
import {ArrowForwardIcon} from "@chakra-ui/icons";
import { Trans } from '@lingui/macro';


const AboutUsPage = () => {
    const [isLoaded, setIsLoaded] = useState(false)
    // пока фото загрузятся skeleton
    useEffect(() => {
        setTimeout(() => {
            setIsLoaded(true)
        }, 1000)
    }, [])

    return (
        <>
            <Grid templateColumns='repeat(5, 1fr)' gap={6}>
                <GridItem w='100%' h='50vh'/>

                <GridItem borderRadius="10%" w='100%'>
                    <Skeleton isLoaded={isLoaded}>
                        <Image src={leftImg} alt={leftImg}/>
                    </Skeleton>
                </GridItem>

                <Grid gap={6}>
                    <GridItem borderRadius="10%" w='100%'>
                        <Skeleton isLoaded={isLoaded}>
                            <Image src={centerTop} alt={centerTop}/>
                        </Skeleton>
                    </GridItem>

                    <GridItem borderRadius="10%" w='100%'>
                        <Skeleton isLoaded={isLoaded}>
                            <Image src={centerBottom} alt={centerBottom}/>
                        </Skeleton>
                    </GridItem>
                </Grid>

                <GridItem borderRadius="10%" w='100%'>
                    <Skeleton isLoaded={isLoaded}>
                        <Image src={rightImg} alt={rightImg}/>
                    </Skeleton>
                </GridItem>

                <GridItem w='100%' h='50vh'/>
            </Grid>

            <Grid pt={6} templateColumns='repeat(2, 1fr)' gap={6}>
                <GridItem w='100%'>
                    <Box
                        borderRadius={5}
                        bgColor={"red.100"}
                        fontWeight={600}
                        fontSize={40} w="100%"
                        textAlign="center">
                        <Trans>About Us</Trans>
                    </Box>

                    {
                        !isLoaded
                            ? <Skeleton m={5} isLoaded={isLoaded}>
                                <Image w="55%" m="0 auto" alignItems="center" src={kitchen} alt={kitchen}/>
                            </Skeleton>
                            : <Image w="55%" m="0 auto" alignItems="center" src={kitchen} alt={kitchen}/>
                    }
                </GridItem>

                <GridItem fontSize="24px" w='100%'>
                    <Box><Trans>Foodshare was born in 2022 when with a small team three teammates. Tarlan decided to organise a
                        foodsharing project with a simple and easy to use cross-platform mobile app.
                    </Trans></Box>

                    <Box pt={2}><Trans>The app allows everyone to post food items that may not be needed in your fridge for one
                        reason
                        or another, and other participants, users can pick them up for free. This also includes the
                        use-by date on or before food from local shops, vegetables or bread from the bakery. Thus
                        benefactors get satisfaction from helping to needy with the reduction of waste from life and
                        deprived persons gratuitous receipt of food with the possibility to choose.
                    </Trans> </Box>

                    <Box pt={2}><Trans>Thus benefactors get satisfaction from helping to needy with the reduction of waste from
                        life
                        and deprived persons gratuitous receipt of food with the possibility to choose.
                    </Trans>  </Box>
                </GridItem>
            </Grid>

            <Box
                borderRadius={5} bgColor="red.100" mt={10} mb={10}
                fontWeight={600} fontSize={40} textAlign="center">
                <Trans>Team</Trans>
            </Box>

            <SimpleGrid columns={2} spacing={3}>
                {teamMockArray.map((el, id) => (
                    <PersonCard
                        aboutExp={el.about}
                        name={el.name}
                        secondName={''}
                        exp={el.exp}
                        img={el.img}
                        key={id}
                        // это заглушка для пропсов id т.к . нужно чтоб не был undefined
                     userID={""}/>
                ))}
            </SimpleGrid>

            <Box fontWeight={600} fontSize={40} w="100%" textAlign="center"><Trans>Design Tribute</Trans></Box>

            <Grid pt={6} pb={6} fontSize={24} fontWeight={400} templateColumns='repeat(2, 1fr)' gap={6}>
                <GridItem w='100%'>
                    <Image m="0 auto" src={company} alt={company}/>
                </GridItem>

                <GridItem w='100%'>
                    <Box>
                        <Trans>An educational platform that helps people change careers into the UX/UI design field through an
                            affordable and short curriculum. Website: https://www.Avocademy.com</Trans>
                    </Box>

                    <Box pt={6}>
                        <Trans>Thank you very much their awesome team that has helped Foodshare to build a beautiful UI/UX
                            design :)</Trans>
                    </Box>
                </GridItem>
            </Grid>

            <Box _hover={{bg: 'red.100'}} fontSize={25} textAlign="end" mt={5}>
                <Link href='/contactUs'>
                    <Trans>Contact Us...</Trans> <ArrowForwardIcon mx={2}/>
                </Link>
            </Box>
        </>

    );
};

export default AboutUsPage;
import React, {FC, RefObject, useEffect, useState} from 'react';
import {Box, Button, Flex} from "@chakra-ui/react";
import {useLocation, useNavigate} from "react-router-dom";

type NavigateButtonsType = {
    messagesAnchorRef?: RefObject<HTMLDivElement>
    title: string
}
const NavigateButtons: FC<NavigateButtonsType> = ({messagesAnchorRef, title}) => {

    const location = useLocation();
    let type = location.pathname.split('/')[1];
    const navigationValue = `/map/${type}`;

    const [scrollTop, setScrollTop] = useState(0);

    const navigate = useNavigate();

    const goToStart = () => {
        if (messagesAnchorRef)
            messagesAnchorRef.current?.scrollIntoView({behavior: 'smooth'});
    }
    useEffect(() => {
        const handleScroll = () => {
            setScrollTop(window.scrollY);
        };
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);
    return (
        <Box left={0} top={"80%"}
             zIndex={1} position={"fixed"} w={"100%"}>
            <Flex justify={"space-between"}>
                <Box w={"30%"}></Box>
                <Box w={"30%"}>
                    <Button
                        color={"whiteAlpha.900"}
                        _hover={{backgroundColor: "gray"}}
                        _active={{backgroundColor: "lightGray", color: "gray"}}
                        backgroundColor={"blackAlpha.900"}
                        m={"0 auto"}
                        display={"block"}
                        boxShadow={"dark-lg"}
                        onClick={() => navigate(navigationValue)}
                        borderRadius={20}
                        variant={"solid"}>
                        {title}
                    </Button></Box>
                <Box w={"30%"}>
                    <Button
                        color={"whiteAlpha.900"}
                        _hover={{backgroundColor: "gray"}}
                        _active={{backgroundColor: "lightGray", color: "gray"}}
                        backgroundColor={"blackAlpha.900"}
                        display={scrollTop > 400 ? "block" : "none"}
                        boxShadow={"dark-lg"}
                        m={"0 auto"}
                        p={0}
                        borderRadius={"50%"}
                        //transform={"auto"} rotate={270}
                        // as={ArrowRightIcon}
                        onClick={goToStart}>UP</Button></Box>


            </Flex>

        </Box>
    );
};

export default NavigateButtons;
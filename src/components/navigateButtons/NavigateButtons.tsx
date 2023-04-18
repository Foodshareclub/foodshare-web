import React, {FC, RefObject, useState} from 'react';
import {Box, Button, Flex} from "@chakra-ui/react";
import {useLocation, useNavigate} from "react-router-dom";
import {useWindowEvent} from "@/hook/useEvent";

type NavigateButtonsType = {
    messagesAnchorRef?: RefObject<HTMLDivElement>
    title: string
    navigateTo?: string
}


const NavigateButtons: FC<NavigateButtonsType> = ({navigateTo, messagesAnchorRef, title}) => {
    const [scrollTop, setScrollTop] = useState(0);
    useWindowEvent('scroll', () => {
        setScrollTop(window.scrollY)
    });
    const location = useLocation();
    let type = location.pathname.split('/')[1];
    const navigationValue = `/map/${type}`;

    const navigate = useNavigate();
    const navigateHandler = () => {
        if (navigateTo) {
            navigate(`/${navigateTo}`)
        } else {
            navigate(navigationValue)
        }
    };
    const goToStart = () => {
        if (messagesAnchorRef)
            messagesAnchorRef.current?.scrollIntoView({behavior: 'smooth'});
    }

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
                        display={!type ? "none" : "block"}
                        boxShadow={"dark-lg"}
                        onClick={() => navigateHandler()}
                        borderRadius={20}
                        variant={"solid"}>
                        {title}
                    </Button>
                </Box>
                <Box w={"30%"} textAlign={"end"}>
                    <Button
                        color={"whiteAlpha.900"}
                        _hover={{backgroundColor: "gray"}}
                        _active={{backgroundColor: "lightGray", color: "gray"}}
                        backgroundColor={"blackAlpha.900"}
                        display={scrollTop > 400 ? "auto" : "none"}
                        boxShadow={"dark-lg"}
                        mr={5}
                        p={0}
                        borderRadius={"50%"}
                        onClick={goToStart}>UP</Button>
                </Box>
            </Flex>

        </Box>
    );
};

export default NavigateButtons;
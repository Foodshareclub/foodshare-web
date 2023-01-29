import {Box} from "@chakra-ui/react";
import {Trans} from "@lingui/macro";
import React from "react";
import {useMediaQuery} from "@/hook";

export const ProductsLocation = () => {
    const isSmallerThan768 = useMediaQuery('(min-width:768px)');

    return (
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
    )
}
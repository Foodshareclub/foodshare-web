import {Box} from "@chakra-ui/react";
import React from "react";

export const ProductsLocation = () => {

    return (
        <Box w={{md: "70%", base: "100%"}} py={{md: 0, base: 10}}>
            <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d2417628.5557509!2d27.986708999999998!3d53.718878999999994!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sru!2sby!4v1671868201476!5m2!1sru!2sby"
                width={"100%"} height="100%"
                style={{border: "0", borderRadius: "10px"}} loading="lazy"
                referrerPolicy="no-referrer-when-downgrade">
            </iframe>
        </Box>

    )
}
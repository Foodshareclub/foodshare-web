import {Box} from "@chakra-ui/react";
import React from "react";

type LocationType = {
    indicator?: string
}
export const ProductsLocation: React.FC<LocationType> = ({indicator}) => {

    return (
        <Box w={{md: indicator ? "70%" : "50%", base: "100%"}} py={{md: 0, base: 10}}>
            <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d158858.182370726!2d-0.10159865000000001!3d51.52864165!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8a00baf21de75%3A0x52963a5addd52a99!2z0JvQvtC90LTQvtC9LCDQktC10LvQuNC60L7QsdGA0LjRgtCw0L3QuNGP!5e0!3m2!1sru!2sro!4v1676644744872!5m2!1sru!2sro"
                width={"100%"} height="100%"
                style={{border: "0", borderRadius: "10px"}} loading="lazy"
                referrerPolicy="no-referrer-when-downgrade">

            </iframe>
        </Box>

    )
}
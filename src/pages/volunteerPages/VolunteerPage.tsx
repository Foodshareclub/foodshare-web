import React, {useEffect} from 'react';
import {Box, SimpleGrid} from "@chakra-ui/react";
import {useActionCreators, useAppSelector} from "@/hook";
import {NavigateButtons, VolunteerCards} from "@/components";
import {getVolunteersTC, volunteersSelector} from "@/store";


const VolunteerPage = () => {
    const actions = useActionCreators({getVolunteersTC})
    const volunteers = useAppSelector(volunteersSelector)
    useEffect(() => {
        actions.getVolunteersTC()
        return () => {
            console.log("dead volunteer page")
        }
    }, [])

    return (
        <Box mt="24vh" px={{xl: 20, base: 7}} mb={"24vh"}
        >
            <NavigateButtons title={"Show map"}/>
            <SimpleGrid columns={{xl: 4, lg: 3, md: 2}}
                        spacing={10}>
                {volunteers.map((item, id) => (
                    <VolunteerCards key={id} volunteer={item}/>
                ))}

            </SimpleGrid>

        </Box>
    );
};

export default VolunteerPage;

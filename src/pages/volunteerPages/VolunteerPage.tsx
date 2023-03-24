import React, {useEffect} from 'react';
import {Box, SimpleGrid} from "@chakra-ui/react";
import {VolunteerCards} from "@/components/volonteerCard/VolonterCards";
import {useActionCreators, useAppSelector} from "@/hook";
import {getVolunteersTC} from "@/store/slices/userReducer";
import {volunteersSelector} from "@/store/slices/userSelectors";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";

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

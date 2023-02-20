import React, {useEffect} from 'react';
import {Box, Button, SimpleGrid} from "@chakra-ui/react";
import {VolunteerCards} from "@/components/volonteerCard/VolonterCards";
import {useActionCreators, useAppSelector} from "@/hook";
import {getVolunteersTC} from "@/store/slices/userReducer";
import {volunteersSelector} from "@/store/slices/userSelectors";

const VolunteerPage = () => {
    const actions=useActionCreators({getVolunteersTC})
  const volunteers = useAppSelector(volunteersSelector)
    useEffect(() => {
        actions.getVolunteersTC()
        return ()=>{
            console.log("dead volunteer page")
        }
    }, [])

    return (
        <Box mt="24vh" px={7} mb={"24vh"}
        >
            <Box left={0} top={"80%"} textAlign={"center"} zIndex={1} position={"fixed"} w={"100%"}>
                <Button
                    alignItems={"center"}
                    alignSelf={"center"}
                    onClick={() => {
                    }}
                    borderRadius={20}
                    variant={"solid"}>
                    Show map
                </Button>
            </Box>
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

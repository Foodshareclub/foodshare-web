import React, {useEffect, useState} from 'react';
import {Box, Button, SimpleGrid} from "@chakra-ui/react";
import {supabase} from "@/supaBase.config";
import {AllValuesType} from "@/api/profileAPI";
import {VolunteerCards} from "@/components/volonteerCard/VolonterCards";
import {useActionCreators} from "@/hook";
import {downloadImgFromDBTC} from "@/store/slices/userReducer";

const VolunteerPage = () => {
    const [obj, setObj] = useState<Array<AllValuesType>>([])
  const actions = useActionCreators({downloadImgFromDBTC})
    console.log(obj)
    useEffect(() => {
        supabase
            .from('profiles').select("*").eq('roles', "{subscriber,volunteer,admin}")//а как только волонтера достать из массива
            .limit(10)
            .then((res) => {
                if (res.data) {
                    setObj(res.data)
                    actions.downloadImgFromDBTC({dir:"avatars",imgUrl:res.data[1].avatar_url})
                }
            })
        //здесь будет запрос на волонтеров
    }, [])

    return (
        <Box pb={["55%", "41%", "35%", "30%", "25%", "12%"]} px={7} mt={["55%", "41%", "35%", "30%", "25%", "12%"]}
             w="100%" mx="auto">
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
                {obj.map((item, id) => (
                    <VolunteerCards key={id} volunteer={item}/>
                ))}

            </SimpleGrid>

        </Box>
    );
};

export default VolunteerPage;

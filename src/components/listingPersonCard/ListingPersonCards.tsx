import React, {ChangeEvent, ReactNode, useEffect, useRef, useState} from 'react';
import {Box, Button, Flex, Heading, Image, Input, Stack} from "@chakra-ui/react";
import peak from "@/assets/peakpx-min.jpg";

import {useActionCreators, useAppSelector} from "@/hook";
import {createPhotoUrl} from "@/utils";
import {EditIcon} from "@chakra-ui/icons";
import {updateProfileTC, uploadImgToDBTC, userActions, userEmailFromSessionSelector} from "@/store";
import AvatarWithRipple from "@/components/listingPersonCard/AvatarWithRipple";
import {AllValuesType} from "@/api/profileAPI";


type PropsType = {
    children?: ReactNode
    settings?: string
}
const ListingPersonCards: React.FC<PropsType> = ({children, settings}) => {

    const [object, setObject] = useState<AllValuesType>({} as AllValuesType)
    const [pastUrl, setPastUrl] = useState<string>(object.avatar_url)
    const inputFileRef = useRef<HTMLInputElement | null>(null)
    //change value to session
    const value = useAppSelector<AllValuesType>(state => state.user.value);
    const actions = useActionCreators({...userActions, updateProfileTC, uploadImgToDBTC});
    const userEmail = useAppSelector(userEmailFromSessionSelector);

    useEffect(() => {
        setObject(value)
    }, [value]);

    const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
        const {file, filePath, url} = createPhotoUrl(event);
        setPastUrl(url);
        const profileImgUrl = `https://***REMOVED***.supabase.co/storage/v1/object/public/avatars/${value.id}/${filePath}`
        await actions.updateProfileTC({
            ...object, avatar_url: filePath ? profileImgUrl : object.avatar_url,
            updated_at: new Date(),
            email: userEmail
        });
        if (filePath) {
            await actions.uploadImgToDBTC({dir: `avatars/${value.id}`, filePath, file});
        }
    }
    return (
        <Box>
            <Image
                h={'200px'}
                w={'full'}
                src={peak}
                objectFit={'cover'}
            />

            <Flex justify={'center'} mt={-12}>
                <AvatarWithRipple img={pastUrl ? pastUrl : object.avatar_url}/>
                {settings && <Button
                    bg={"gray.200"}
                    _hover={{bg: 'green.200'}}
                    variant={"solid"}
                    top={"48vh"}
                    left={"51vw"}
                    p={2}
                    borderRadius={"50%"}
                    position={"absolute"}
                    cursor={"pointer"}
                    onClick={() => inputFileRef?.current?.click()}
                    as={EditIcon}/>}
            </Flex>
            <Stack alignSelf={"center"}>
                <Box>
                    <Heading textAlign={"center"} size='md'>
                        {value.first_name} {value.second_name}
                    </Heading>
                    <Input
                        w={0}
                        opacity={0}
                        position="absolute"
                        h="22%" left={0}
                        top="9%"
                        accept="image/png, image/jpeg, image/webp"
                        ref={inputFileRef}
                        type="file"
                        onChange={(e) => uploadAvatar(e)}
                    />
                    {children}
                </Box>
            </Stack>
        </Box>
    );
};

export default ListingPersonCards;
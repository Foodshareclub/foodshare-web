import {useAppSelector} from "@/hook";
import {avatarURLSelector, userFirstNameSelector, userSecondNameSelector} from "@/store";
import AvatarWithRipple from "@/components/listingPersonCard/AvatarWithRipple";
import {Box, Flex, Heading, Input, InputGroup, InputLeftElement, Stack} from "@chakra-ui/react";
import {SearchIcon} from "@chakra-ui/icons";
import {t} from "@lingui/macro";
import {MinifiedUserInfo} from "@/components";
import React from "react";

const ContactsBlock = () => {
    const imgUrl = useAppSelector(avatarURLSelector);
    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);

    return (
        <Box>
            <AvatarWithRipple img={imgUrl}/>
            <Flex direction={"column"} alignSelf={"center"}>
                <Box py={2}>
                    <Heading textAlign={"center"} size='md'>
                        {userFirstName} {userSecondName}
                    </Heading>
                </Box>

                <InputGroup  alignSelf="center"  alignItems="center" flexDir="column">
                    <InputLeftElement
                        pointerEvents={"stroke"}
                        children={<SearchIcon
                        />}
                    />
                    <Input
                        placeholder={t({
                            id: `msg.Search people`,
                            message: `Search people`
                        })}
                    />
                </InputGroup>
                <Box mt={10} bg={"gray.100"} borderRadius={"10%"} px={2} height={"300px"} overflow={"auto"}>
                    <MinifiedUserInfo
                        src={imgUrl}
                        description={'SOME PRODUCT NAME'}
                        firstName={'fNAME'}
                        secondName={'sName'}
                    />
                    <MinifiedUserInfo
                        src={imgUrl}
                        description={'SOME PRODUCT NAME'}
                        firstName={'fNAME'}
                        secondName={'sName'}
                    />
                    <MinifiedUserInfo
                        src={imgUrl}
                        description={'SOME PRODUCT NAME'}
                        firstName={'fNAME'}
                        secondName={'sName'}
                    /><MinifiedUserInfo
                        src={imgUrl}
                        description={'SOME PRODUCT NAME'}
                        firstName={'fNAME'}
                        secondName={'sName'}
                    /><MinifiedUserInfo
                        src={imgUrl}
                        description={'SOME PRODUCT NAME'}
                        firstName={'fNAME'}
                        secondName={'sName'}
                    /><MinifiedUserInfo
                        src={imgUrl}
                        description={'SOME PRODUCT NAME'}
                        firstName={'fNAME'}
                        secondName={'sName'}
                    /><MinifiedUserInfo
                    src={imgUrl}
                    description={'SOME PRODUCT NAME'}
                    firstName={'fNAME'}
                    secondName={'sName'}
                />
                </Box>

            </Flex>
        </Box>
    )
}
export default ContactsBlock;
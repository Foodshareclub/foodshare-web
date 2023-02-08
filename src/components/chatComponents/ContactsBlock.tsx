import {useAppSelector} from "@/hook";
import {avatarURLSelector, userFirstNameSelector, userSecondNameSelector} from "@/store";
import AvatarWithRipple from "@/components/listingPersonCard/AvatarWithRipple";
import {Box, Flex, Heading, Input, InputGroup, InputLeftElement} from "@chakra-ui/react";
import {SearchIcon} from "@chakra-ui/icons";
import {t} from "@lingui/macro";
import {MinifiedUserInfo} from "@/components";
import React from "react";

const ContactsBlock = () => {
    const imgUrl = useAppSelector(avatarURLSelector);
    const userFirstName = useAppSelector(userFirstNameSelector);
    const userSecondName = useAppSelector(userSecondNameSelector);

    return (
        <Flex direction={"column"} justify={"space-between"}>
            <Flex direction={"column"} alignSelf={"center"}>
                <AvatarWithRipple img={imgUrl}/>
                <Box py={2}>
                    <Heading textAlign={"center"} size='md'>
                        {userFirstName} {userSecondName}
                    </Heading>
                </Box>

                <InputGroup alignSelf="center" alignItems="center">
                    <InputLeftElement
                        pointerEvents={"stroke"}
                        children={<SearchIcon
                        />}
                    />
                    <Input
                        placeholder={t({
                            id: `msg.Search...`,
                            message: `Search...`
                        })}
                    />
                </InputGroup>
            </Flex>
            <Flex direction={"column"} alignSelf={"center"}>
                <Box bg={"gray.100"} borderRadius={"10%"} px={2} height={"300px"} overflow={"auto"}>
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
        </Flex>
    )
}
export default ContactsBlock;
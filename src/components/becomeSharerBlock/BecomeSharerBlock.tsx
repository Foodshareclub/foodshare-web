import {
    Box,
    Button,
    Flex,
    Image,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Text,
    useColorModeValue,
    useDisclosure
} from "@chakra-ui/react";
import * as React from "react";
import {useState} from "react";
import {PublishListingModal} from "@/components";
import {photoObj} from "@/utils/navigationActions";

export const BecomeSharerBlock = () => {
    const {isOpen, onOpen, onClose} = useDisclosure();
    const [type, setType] = useState('');
    const addHandler = (value: string) => {
        onOpen();
        setType(value)
    }
    return (
        <Menu>
            <PublishListingModal value={type} onClose={onClose} isOpen={isOpen}/>
            <MenuButton display={{md: "block", base: "none"}} color={"#7D7D7D"} fontSize={{md: "18px", base: "14px"}}
                        bg={"none"} alignSelf={"center"} as={Button}>
                Become a Sharer
            </MenuButton>

            <MenuList
                boxShadow={'0px 5px 10px 2px rgba(34, 60, 80, 0.2)'}
            >
                <Flex justify={"center"}>
                    <Box
                        borderRightWidth={1}
                        borderStyle={'solid'}
                        borderColor={useColorModeValue('gray.200', 'gray.700')}
                        textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Sharers
                        </Text>
                        <MenuItem  onClick={() => addHandler('food')}>
                            <Image src={photoObj.food} boxSize={6}
                            /><Text pl={3}>Add food</Text></MenuItem>
                        <MenuItem  onClick={() => addHandler('things')}>
                            <Image src={photoObj.things} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}> Add things</Text>
                        </MenuItem>
                        <MenuItem  onClick={() => addHandler('borrow')}>
                            <Image src={photoObj.borrow} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}> Add borrow</Text>
                        </MenuItem>
                        <MenuItem  onClick={() => addHandler('wanted')}>
                            <Image src={photoObj.wanted} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}>Add wanted</Text>
                        </MenuItem>
                    </Box>

                    <Box
                        borderRightWidth={1}
                        borderStyle={'solid'}
                        borderColor={useColorModeValue('gray.200', 'gray.700')}
                        textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Volunteers
                        </Text>
                        <MenuItem  onClick={() => alert("in process")}>
                            <Image src={photoObj.volunteer} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}>Become volunteer</Text>
                        </MenuItem>
                    </Box>

                    <Box
                        borderRightWidth={1}
                        borderStyle={'solid'}
                        borderColor={useColorModeValue('gray.200', 'gray.700')}
                        textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Businesses
                        </Text>
                        <MenuItem  onClick={() => addHandler('fridge')}>
                            <Image src={photoObj.fridges} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}>Add fridge</Text>
                        </MenuItem>
                        <MenuItem onClick={() => addHandler('buss-foodbank')}>
                            <Image src={photoObj.foodBanks} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}>Add foodbank</Text>
                        </MenuItem>
                    </Box>

                    <Box
                        borderRightWidth={1}
                        borderStyle={'solid'}
                        borderColor={useColorModeValue('gray.200', 'gray.700')}
                        textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Social
                        </Text>
                        <MenuItem  onClick={() => addHandler('challenge')}>
                            <Image src={photoObj.challenges} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}> Add a challenge</Text>
                        </MenuItem>
                        <MenuItem  onClick={() => addHandler('soc-foodbank')}>
                            <Image src={photoObj.socFoodB} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}>Add foodbank</Text>
                        </MenuItem>
                    </Box>
                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Sustainability
                        </Text>
                        <MenuItem  onClick={() => addHandler('merchandise')}>
                            <Image src={photoObj.merchandise} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}>Add a merchandise</Text>
                        </MenuItem>
                        <MenuItem  onClick={() => addHandler('vegan-food')}>
                            <Image src={photoObj.veganFood} boxSize={6}
                                   alignItems="center"/>
                            <Text pl={3}>Add a vegan food</Text>
                        </MenuItem>
                    </Box>
                </Flex>
            </MenuList>

        </Menu>

    )
}
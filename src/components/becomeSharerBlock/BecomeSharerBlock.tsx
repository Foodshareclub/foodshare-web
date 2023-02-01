import {border, Box, Button, Flex, Menu, MenuButton, MenuItem, MenuList, Text, useDisclosure} from "@chakra-ui/react";
import * as React from "react";
import {PublishListingModal} from "@/components";
import {useState} from "react";

export const BecomeSharerBlock = () => {
    const {isOpen, onOpen, onClose} = useDisclosure();
    const [type,setType]=useState('');
    const addHandler=(value:string)=>{
        onOpen();
        setType(value)
    }
    return (
        <Menu>
            <PublishListingModal value={type} onClose={onClose} isOpen={isOpen}/>
            <MenuButton display={{md: "block", base: "none"}}  color={"#7D7D7D"} fontSize={{md: "18px", base: "14px"}} bg={"none"} alignSelf={"center"} as={Button} >
                Become a Sharer
            </MenuButton>
            <Flex justifyContent={"center"} alignItems={"center"}>
            <MenuList
                marginTop={'90px'}
                marginLeft={'20px'}
                p={5}
                boxShadow={'0px 5px 10px 2px rgba(34, 60, 80, 0.2)'}
            >
                <Flex justify={"space-around"}>
                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Sharers
                        </Text>
                        <MenuItem onClick={()=>addHandler('food')}>Add food</MenuItem>
                        <MenuItem onClick={()=>addHandler('things')}>Add things</MenuItem>
                        <MenuItem onClick={()=>addHandler('borrow')}>Add borrow</MenuItem>
                        <MenuItem onClick={()=>addHandler('wanted')}>Add wanted</MenuItem>
                    </Box>

                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Volunteers
                        </Text>
                        <MenuItem onClick={()=>alert("in process")}>Become volunteer</MenuItem>
                    </Box>

                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Businesses
                        </Text>
                        <MenuItem onClick={()=>addHandler('fridge')}>Add fridge</MenuItem>
                        <MenuItem onClick={()=>addHandler('buss-foodbank')}>Add foodbank</MenuItem>
                    </Box>

                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Social
                        </Text>
                        <MenuItem onClick={()=>addHandler('challenge')}>Add a challenge</MenuItem>
                        <MenuItem onClick={()=>addHandler('soc-foodbank')}>Add foodbank</MenuItem>
                    </Box>

                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Sustainability
                        </Text>
                        <MenuItem onClick={()=>addHandler('merchandise')}>Add a merchandise</MenuItem>
                        <MenuItem onClick={()=>addHandler('vegan-food')}>Add a vegan food</MenuItem>
                    </Box>
                </Flex>
            </MenuList>
            </Flex>
        </Menu>

    )
}
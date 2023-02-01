import {border, Box, Button, Flex, Menu, MenuButton, MenuItem, MenuList, Text} from "@chakra-ui/react";
import * as React from "react";

export const BecomeSharerBlock = () => {
    return (
        <Menu>
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
                        <MenuItem>Add food</MenuItem>
                        <MenuItem>Add things</MenuItem>
                        <MenuItem>Add borrow</MenuItem>
                        <MenuItem>Add wanted</MenuItem>
                    </Box>

                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Volunteers
                        </Text>
                        <MenuItem

                        >
                            Become volunteer
                        </MenuItem>
                    </Box>

                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Businesses
                        </Text>
                        <MenuItem>Add fridge</MenuItem>
                        <MenuItem>Add foodbank</MenuItem>
                    </Box>

                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Social
                        </Text>
                        <MenuItem>Add a challenge</MenuItem>
                        <MenuItem>Add foodbank</MenuItem>
                    </Box>

                    <Box textAlign={"center"}>
                        <Text fontSize="18px" fontWeight={600} mb={3}>
                            Sustainability
                        </Text>
                        <MenuItem>Add a merchandise</MenuItem>
                        <MenuItem>Add a vegan food</MenuItem>
                    </Box>
                </Flex>
            </MenuList>
            </Flex>
        </Menu>

    )
}
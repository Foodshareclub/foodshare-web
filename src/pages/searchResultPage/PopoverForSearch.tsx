import {
    Flex,
    IconButton,
    Input,
    Popover,
    PopoverArrow,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
    Radio,
    RadioGroup,
    Stack,
    useBoolean
} from "@chakra-ui/react";
import * as React from "react";
import {ChangeEvent, useState} from "react";
import {SearchIcon} from "@chakra-ui/icons";
import {t} from "@lingui/macro";
import {useNavigate} from "react-router-dom";

const PopoverForSearch = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useBoolean()
    const [searchValue, setSearchValue] = useState('');
    const [productType, setProductType] = useState('all');

    const onSearchHandler = (e: ChangeEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value);

    const onFindResultsHandler = async () => {
        if (searchValue) {
            navigate(`/s/${productType}?key_word=${searchValue}`);
            setProductType('all');
            setSearchValue('');
        }
    }
    return (
        <Popover
            isOpen={isEditing}
            onOpen={setIsEditing.on}
            onClose={setIsEditing.off}
            closeOnBlur={true}
            isLazy
            lazyBehavior='keepMounted'
            placement='bottom'
        >
            <Flex position={"relative"} align="center" w={{md: "30%", base: "100%"}}>
                <PopoverTrigger>
                    <Input
                        borderRadius={20}
                        value={searchValue}
                        onChange={onSearchHandler}
                        placeholder={t({
                            id: `msg.Input`,
                            message: `What are we in search of today?`
                        })}
                    />
                </PopoverTrigger>
                <Flex right={0} position={"absolute"} zIndex={1} justifyContent={"end"}>
                    <IconButton
                        size={"sm"}
                        mr={1}
                        borderRadius={"50%"}
                        variant={"outline"}
                        onClick={onFindResultsHandler}
                        cursor={"pointer"}
                        aria-label={""}
                        children={
                            <SearchIcon color={!isEditing ? "gray.500" : 'red.500'}/>}
                    />
                </Flex>
            </Flex>
            <PopoverContent
                bg={"red.400"}
                width={'100%'}
                height={'50px'}
            >
                <PopoverArrow/>
                <PopoverBody>
                    <RadioGroup
                        onChange={setProductType} value={productType}
                    >
                        <Stack color={"white"} direction='row'>
                            <Radio value='all'>All</Radio>
                            <Radio value='food'>Food</Radio>
                            <Radio value='things'>Things</Radio>
                            <Radio value='borrow'>Borrow</Radio>
                            <Radio value='wanted'>Wanted</Radio>
                            <Radio value='foodbanks'>FoodBanks</Radio>
                        </Stack>
                    </RadioGroup>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    )
}
export default PopoverForSearch
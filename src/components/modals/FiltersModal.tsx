import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Slider,
    SliderFilledTrack,
    SliderMark,
    SliderThumb,
    SliderTrack,
    Text,
    useDisclosure
} from '@chakra-ui/react';
import React, {useState} from 'react';
import {useActionCreators, useAppSelector} from "@/hook";
import {geoDistanceSelector, productActions} from '@/store';

const FiltersModal = () => {
    const actions = useActionCreators({...productActions});
    const radius = useAppSelector(geoDistanceSelector);
    const {isOpen, onOpen, onClose} = useDisclosure();
    const [sliderValue, setSliderValue] = useState(radius || 0);

    const applyFilterMode = () => {
      actions.changeGeoDistance(sliderValue);
      onClose();
    }
    const cancel = () => {
      actions.changeGeoDistance(null);
      onClose();
    }
    return (
        <>
            <Button display={{md: 'block', base: 'none'}}
                    right={{xl: 20, base: 7}}
                    variant="outline"
                    position="absolute"
                    alignSelf="center"
                    onClick={onOpen}>Filter</Button>

            <Modal blockScrollOnMount={false} isOpen={isOpen} onClose={onClose}>
                <ModalOverlay/>
                <ModalContent>
                    <ModalHeader textAlign={"center"}>Filter</ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody>
                        <Text textAlign={"center"} fontWeight='bold' mb='3rem'>
                            How far from you to show the products?
                        </Text>
                        <Slider defaultValue={radius || 0} step={200} max={10000} mb='3rem' aria-label='slider-ex-6'
                                onChange={(val) => setSliderValue(val)}>
                            <SliderMark
                                value={sliderValue}
                                textAlign='center'
                                color='blackAlpha.800'
                                mt='-10'
                                ml='-5'
                            >
                                {sliderValue}km
                            </SliderMark>
                            <SliderTrack bg='red.100'>
                                <SliderFilledTrack bg='tomato'/>
                            </SliderTrack>
                            <SliderThumb/>
                        </Slider>
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme='blue' mr={3} onClick={cancel}>
                            Cancel
                        </Button>
                        <Button onClick={applyFilterMode} variant='ghost'>Apply</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

export default FiltersModal;
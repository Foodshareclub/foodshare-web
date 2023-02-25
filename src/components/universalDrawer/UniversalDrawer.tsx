import React, {FC, ReactNode} from 'react';
import {Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader, DrawerOverlay} from "@chakra-ui/react";

export type PlacementType="top" | "left" | "bottom" | "right" | undefined | "start" | "end"
type UniversalDrawerType = {
    onClose: () => void
    isOpen: boolean
    size?: string
    children: ReactNode
    headerValue?: string
    placement:PlacementType
}
const UniversalDrawer: FC<UniversalDrawerType> = ({placement,headerValue, onClose, isOpen, size, children}) => {
    return (
        <Drawer placement={placement} onClose={onClose} isOpen={isOpen} size={size}>
            <DrawerOverlay/>
            <DrawerContent>
                <DrawerCloseButton/>
                <DrawerHeader>{headerValue}</DrawerHeader>
                <DrawerBody>
                    {children}
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    );
};

export default UniversalDrawer;
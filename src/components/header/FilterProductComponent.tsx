import * as React from 'react';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import {navigationActions} from "../../utils/navigationActions";



export default function SimpleBottomNavigation() {
    const [value, setValue] = React.useState(0);

    return (
        <Box sx={{width: "auto" , height:"50%"}}>
            <BottomNavigation
                sx={{paddingTop:"2%"}}
                showLabels
                value={value}
                onChange={(event, newValue) => {
                    setValue(newValue);
                }}
            >
                {navigationActions.map(el => {
                    return <BottomNavigationAction
                        key={el.name}
                        label={el.name}
                        icon={<img src={el.src} alt={el.src}
                        />}/>
                })}
            </BottomNavigation>
        </Box>
    );
}
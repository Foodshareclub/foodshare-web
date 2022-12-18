import React from 'react';
import {styled} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import {supabase} from "../../supaBase.config";
import {Button} from "@mui/material";
import burger from "../../assets/burgers.png";
import {mockArray} from "../../utils/mockArray";
import {useNavigate} from "react-router-dom";

const Item = styled(Paper)(({theme}) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

export default function Main() {

    const navigate = useNavigate();
    return (
        <Box sx={{flexGrow: 1, height: "70%"}}>
            <Grid container spacing={3} sx={{margin: "0", width: "98%"}}>
                {mockArray.map((item, id) => (
                    <Grid key={id} item xs={4}>
                        <div style={{fontWeight: "700", fontSize: "16px", textAlign: "center", margin: "0 2%"}}>
                            <img style={{cursor:"pointer"}} onClick={() => navigate("/oneProd",{state:{photo:item.img}})} src={item.img} alt="soup"/>
                            <div style={{margin: "2% 8%"}}>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "16px"}}>Name:</div>
                                    <div style={{fontWeight: "400"}}>{item.name}</div>
                                </div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "16px"}}>Distance:</div>
                                    <div style={{fontWeight: "400"}}>{item.distance}</div>
                                </div>
                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "16px"}}>Available:</div>
                                    <div style={{fontWeight: "400"}}>{item.available_time}</div>
                                </div>

                                <div style={{display: 'flex', justifyContent: "space-between"}}>
                                    <div style={{fontWeight: "700", fontSize: "16px"}}>About:</div>
                                    <div style={{fontWeight: "400"}}>{item.description}</div>
                                </div>
                            </div>

                        </div>
                    </Grid>
                ))}

            </Grid>
        </Box>
    );
}
"use client";

import { useEffect, useState } from "react";
import { OnboardingTour } from "@/components/OnboardingTour";


export function OnboardingWrapper(){

const [show,setShow] = useState(false);


useEffect(()=>{

const completed =
localStorage.getItem(
"konek_onboarding_completed"
);


if(!completed){

setShow(true);

}

},[]);



if(!show){

return null;

}



return (

<OnboardingTour

onComplete={()=>setShow(false)}

/>

);

}

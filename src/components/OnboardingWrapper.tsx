"use client";

import { useEffect, useState } from "react";
import { OnboardingTour } from "@/components/OnboardingTour";


export function OnboardingWrapper(){

const [mounted,setMounted] = useState(false);

const [show,setShow] = useState(false);



useEffect(()=>{

setMounted(true);


const completed =
window.localStorage.getItem(
"raviion_onboarding_completed"
);


if(!completed){

setShow(true);

}


},[]);



function complete(){

window.localStorage.setItem(
"raviion_onboarding_completed",
"true"
);


setShow(false);


window.location.reload();

}



if(!mounted || !show){

return null;

}



return (

<OnboardingTour

onComplete={complete}

/>

);

}

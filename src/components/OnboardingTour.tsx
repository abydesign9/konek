"use client";

import { useState } from "react";

interface Props {
  onComplete?: () => void;
}


const steps = [
  {
    icon: "👋",
    title: "Welcome to raviion",
    text: "Your smart financial companion for payments, savings and global access."
  },
  {
    icon: "✅",
    title: "Verify Your Identity",
    text: "Complete verification to unlock wallet funding and financial services."
  },
  {
    icon: "💰",
    title: "Fund Your Wallet",
    text: "Add money to your raviion wallet and start using services instantly."
  },
  {
    icon: "📱",
    title: "Buy Your First Service",
    text: "Purchase airtime, data, eSIM and other services easily."
  },
  {
    icon: "🌍",
    title: "Create Global Accounts",
    text: "Access international financial features."
  },
  {
    icon: "💳",
    title: "Get Your Virtual Card",
    text: "Spend online securely with your raviion card."
  }
];


export function OnboardingTour({onComplete}:Props){

const [step,setStep] = useState(0);


const current = steps[step];


function finish(){

localStorage.setItem(
"raviion_onboarding_completed",
"true"
);

if(onComplete){
onComplete();
}

}



function next(){

if(step < steps.length - 1){

setStep(step + 1);

}else{

finish();

}

}



return (

<div className="fixed inset-0 z-50 bg-background flex items-center justify-center px-6">

<div className="max-w-sm w-full text-center">


<div className="text-6xl mb-6">
{current.icon}
</div>


<h1 className="text-2xl font-bold text-indigo">
{current.title}
</h1>


<p className="text-indigo/60 mt-3">
{current.text}
</p>



<div className="flex justify-center gap-2 mt-8">

{steps.map((_,index)=>(

<div
key={index}
className={`h-2 rounded-full ${
index===step
?
"w-8 bg-indigo"
:
"w-2 bg-indigo/20"
}`}
/>

))}

</div>



<button

onClick={next}

className="mt-8 w-full rounded-xl bg-indigo text-white py-3.5 font-semibold"

>

{
step === steps.length - 1
?
"Start Using raviion"
:
"Continue"
}

</button>




<button

onClick={finish}

className="mt-4 text-sm text-indigo/50"

>

Skip Tour

</button>


</div>

</div>

);

}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";


interface Plan {
  id:string;
  external_id:string;
  name:string;
  price_minor:string;
  network:string;
}



function money(minor:number){

return `₦${(minor/100).toLocaleString()}`;

}



export default function ExamPinPage(){

const router = useRouter();

const [plans,setPlans]=useState<Plan[]>([]);

const [selected,setSelected]=useState<Plan|null>(null);

const [candidate,setCandidate]=useState("");

const [pin,setPin]=useState("");

const [showPin,setShowPin]=useState(false);

const [error,setError]=useState("");

const [success,setSuccess]=useState(false);



useEffect(()=>{

fetch("/api/catalog?serviceType=exam_pin")
.then(r=>r.json())
.then(d=>setPlans(d.plans ?? []));

},[]);



function proceed(){

if(!selected){

setError("Select exam PIN");

return;

}

if(!candidate){

setError("Enter candidate information");

return;

}

setError("");

setShowPin(true);

}



async function submit(finalPin:string){

const res =
await fetch("/api/purchases",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

serviceType:"exam_pin",

network:selected!.network,

phone:candidate,

planExternalId:selected!.external_id,

pin:finalPin,

idempotencyKey:crypto.randomUUID()

})

});


const data =
await res.json().catch(()=>({}));


if(!res.ok){

setError(data.error ?? "Purchase failed");

setShowPin(false);

return;

}


setSuccess(true);

}





if(success){

return (

<main className="min-h-screen bg-background flex items-center justify-center px-6">

<div className="rounded-3xl bg-white border p-8 text-center">

<div className="text-5xl mb-4">
✅
</div>

<h1 className="font-bold text-indigo text-xl">
Exam PIN Successful
</h1>

<p className="text-sm text-indigo/60 mt-3">
Your exam PIN has been generated.
</p>


<button
onClick={()=>router.push("/wallet")}
className="mt-6 bg-indigo text-white rounded-xl px-8 py-3 font-semibold"
>
Done
</button>

</div>

</main>

);

}





if(showPin){

return (

<main className="min-h-screen bg-background flex items-center justify-center px-6">

<div className="max-w-xs w-full">

<h1 className="text-center font-bold text-indigo mb-6">
Confirm Purchase
</h1>


<PinPad
value={pin}
onChange={setPin}
onComplete={submit}
/>


{error &&
<p className="text-red-600 text-sm text-center mt-4">
{error}
</p>
}


</div>

</main>

);

}





return (

<main className="min-h-screen bg-background">

<PageHeader
title="Exam PIN"
backHref="/home"
/>


<div className="max-w-lg mx-auto px-5 py-6">


<p className="text-sm text-indigo/60 mb-5">
Purchase examination PINs instantly.
</p>


<div className="space-y-3">

{plans.map(plan=>(

<button
key={plan.id}
onClick={()=>setSelected(plan)}
className={`w-full rounded-2xl border p-4 text-left ${
selected?.id===plan.id
?
"border-konek-green bg-konek-green/10"
:
"bg-white"
}`}
>

<div className="flex justify-between">

<span className="font-semibold text-indigo">
{plan.name}
</span>

<span className="font-bold text-indigo">
{money(Number(plan.price_minor))}
</span>

</div>

</button>

))}

</div>



<input

value={candidate}

onChange={e=>setCandidate(e.target.value)}

placeholder="Candidate number / phone"

className="mt-5 w-full rounded-xl border px-4 py-3"

/>



<button

onClick={proceed}

className="mt-6 w-full rounded-xl bg-indigo text-white py-3 font-semibold"

>
Continue
</button>


{error &&
<p className="mt-3 text-sm text-red-600">
{error}
</p>
}


</div>

</main>

);

}

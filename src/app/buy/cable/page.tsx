"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

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
  meta?:{
    validityDays?:number;
  };
}


const PROVIDERS = [
  "DSTV",
  "GOTV",
  "STARTIMES"
];


function naira(minor:number){

  return `₦${(minor/100).toLocaleString()}`;

}



export default function CablePage(){

const router = useRouter();

const [plans,setPlans] = useState<Plan[]>([]);

const [provider,setProvider] = useState("");

const [smartcard,setSmartcard] = useState("");

const [selected,setSelected] = useState<Plan|null>(null);

const [pin,setPin] = useState("");

const [showPin,setShowPin] = useState(false);

const [loading,setLoading] = useState(false);

const [error,setError] = useState("");

const [success,setSuccess] = useState(false);



useEffect(()=>{

fetch("/api/catalog?serviceType=cable")
.then(res=>res.json())
.then(data=>setPlans(data.plans ?? []));

},[]);




const visiblePlans =
plans.filter(
(plan)=>
!provider ||
plan.network.toUpperCase()===provider
);





function proceed(){

if(!provider){

setError("Select provider");
return;

}

if(!smartcard){

setError("Enter smartcard number");
return;

}

if(!selected){

setError("Choose package");
return;

}

setError("");
setShowPin(true);

}




async function submit(finalPin:string){

setLoading(true);

const res =
await fetch("/api/purchases",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

serviceType:"cable",

network:selected!.network,

phone:smartcard,

planExternalId:selected!.external_id,

pin:finalPin,

idempotencyKey:crypto.randomUUID()

})

});



const data =
await res.json().catch(()=>({}));


setLoading(false);



if(redirectIfKycGate(res,data))return;
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


<div className="rounded-3xl bg-white border p-8 text-center max-w-sm">


<div className="text-5xl mb-4">
✅
</div>


<h1 className="text-xl font-bold text-indigo">
Cable Payment Successful
</h1>


<p className="text-sm text-indigo/60 mt-3">
{provider} subscription completed.
</p>


<button

onClick={()=>router.push("/wallet")}

className="mt-6 w-full rounded-xl bg-indigo text-white py-3 font-semibold"

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


<h1 className="text-lg font-bold text-indigo text-center mb-2">
Confirm Cable Payment
</h1>


<p className="text-sm text-indigo/60 text-center mb-6">

{selected?.name}

</p>


<PinPad

value={pin}

onChange={setPin}

onComplete={submit}

/>


{loading && (

<p className="mt-4 text-center text-sm text-indigo/50">
Processing...
</p>

)}


{error && (

<p className="mt-4 text-center text-sm text-red-600">
{error}
</p>

)}


</div>


</main>

);

}





return (

<main className="min-h-screen bg-background">


<PageHeader
title="Cable TV"
backHref="/home"
/>



<div className="max-w-lg mx-auto px-5 py-6">


<p className="text-sm text-indigo/60 mb-6">
Pay your TV subscription instantly.
</p>




<div className="grid grid-cols-3 gap-2 mb-6">


{PROVIDERS.map(item=>(

<button

key={item}

onClick={()=>{

setProvider(item);
setSelected(null);

}}

className={`rounded-xl py-3 text-sm font-semibold ${
provider===item
?
"bg-indigo text-white"
:
"bg-white border text-indigo"
}`}

>

{item}

</button>

))}


</div>





<input

value={smartcard}

onChange={(e)=>setSmartcard(e.target.value)}

placeholder="Smartcard / IUC number"

className="w-full rounded-xl border px-4 py-3 mb-5"

/>





<div className="flex flex-col gap-3">


{visiblePlans.map(plan=>(

<button

key={plan.id}

onClick={()=>setSelected(plan)}

className={`rounded-2xl border p-4 text-left ${
selected?.id===plan.id
?
"border-raviion-green bg-raviion-green/10"
:
"bg-white border-indigo/10"
}`}

>


<div className="flex justify-between">

<span className="font-semibold text-indigo">
{plan.name}
</span>


<span className="font-bold text-indigo">
{naira(Number(plan.price_minor))}
</span>


</div>


</button>

))}


</div>




<button

onClick={proceed}

className="mt-6 w-full rounded-xl bg-indigo text-white py-3.5 font-semibold"

>
Continue
</button>



{error && (

<p className="mt-4 text-sm text-red-600">
{error}
</p>

)}



</div>


</main>

);

}

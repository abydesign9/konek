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
  meta?:{
    dataMb?:number;
    validityDays?:number;
  };
}


const NETWORKS = [
"MTN",
"Airtel",
"Glo",
"9mobile"
];


function naira(minor:number){

return `₦${(minor/100).toLocaleString()}`;

}



export default function DataPage(){

const router = useRouter();


const [plans,setPlans] =
useState<Plan[]>([]);

const [network,setNetwork] =
useState("");

const [phone,setPhone] =
useState("");

const [selected,setSelected] =
useState<Plan|null>(null);

const [pin,setPin] =
useState("");

const [showPin,setShowPin] =
useState(false);

const [loading,setLoading] =
useState(false);

const [error,setError] =
useState("");

const [success,setSuccess] =
useState(false);



useEffect(()=>{

fetch("/api/catalog?serviceType=data")
.then(res=>res.json())
.then(data=>setPlans(data.plans ?? []));

},[]);




const visiblePlans =
plans.filter(
(plan)=>
!network ||
plan.network.toUpperCase()===network
);




function proceed(){

if(!network){

setError("Select a network");
return;

}


if(!phone){

setError("Enter phone number");
return;

}


if(!selected){

setError("Choose a data plan");
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

serviceType:"data",

network:selected!.network,

phone,

planExternalId:selected!.external_id,

pin:finalPin,

idempotencyKey:crypto.randomUUID()

})

});


const data =
await res.json().catch(()=>({}));

setLoading(false);



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
Data Purchase Successful
</h1>


<p className="text-sm text-indigo/60 mt-3">
{selected?.name} sent to {phone}
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
Confirm Data Purchase
</h1>


<p className="text-center text-sm text-indigo/60 mb-6">
{selected?.name}
</p>


<PinPad

value={pin}

onChange={setPin}

onComplete={submit}

/>


{loading && (

<p className="text-center text-sm text-indigo/50 mt-4">
Processing...
</p>

)}


{error && (

<p className="text-center text-sm text-red-600 mt-4">
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
title="Buy Data"
backHref="/home"
/>



<div className="max-w-lg mx-auto px-5 py-6">


<p className="text-sm text-indigo/60 mb-6">
Choose a bundle and stay connected.
</p>



<div className="grid grid-cols-4 gap-2 mb-6">

{NETWORKS.map(item=>(

<button

key={item}

onClick={()=>{

setNetwork(item);
setSelected(null);

}}

className={`rounded-xl py-3 font-semibold text-sm ${
network===item
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

value={phone}

onChange={(e)=>setPhone(e.target.value)}

placeholder="Phone number"

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
"border-konek-green bg-konek-green/10"
:
"border-indigo/10 bg-white"
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


<p className="text-xs text-indigo/50 mt-2">

{plan.meta?.dataMb
?
`${plan.meta.dataMb / 1000}GB`
:
""}

{plan.meta?.validityDays
?
` · ${plan.meta.validityDays} days`
:
""}

</p>


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

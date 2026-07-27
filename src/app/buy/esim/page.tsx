"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";
import { QrCode } from "@/components/QrCode";
import { esimLpaString } from "@/lib/esim";

interface PlanMeta {
  type?: "country" | "region" | "global";
  dataMb?: number;
  validityDays?: number;
  flag?: string;
  place?: string;
}

interface Plan {
  id: string;
  external_id: string;
  name: string;
  network: string;
  price_minor: string;
  currency: string;
  meta: PlanMeta | null;
}

type PackType = "country" | "region" | "global";

const TABS = [
  { id: "country", label: "Countries" },
  { id: "region", label: "Regions" },
  { id: "global", label: "Global" },
] as const;


function usd(minor:number){
  return `$${(minor / 100).toLocaleString()}`;
}


function BuyEsim(){



const [tab,setTab] =
useState<PackType>("country");


const [plans,setPlans] =
useState<Plan[]>([]);


const [selected,setSelected] =
useState<Plan|null>(null);


const [pinMode,setPinMode] =
useState(false);


const [pin,setPin] =
useState("");


const [loading,setLoading] =
useState(false);


const [error,setError] =
useState("");



const [issued,setIssued] =
useState<{token:string;txnId:string}|null>(null);



useEffect(()=>{

fetch("/api/catalog?serviceType=esim")
.then(r=>r.json())
.then(d=>setPlans(d.plans ?? []));

},[]);




const filtered =
useMemo(()=>{

return plans.filter(
p=>(p.meta?.type ?? "country")===tab
);

},[plans,tab]);





function buy(){

if(!selected){

setError("Select a data plan");

return;

}

setError("");

setPinMode(true);

}




async function submit(finalPin:string){

setLoading(true);

const res =
await fetch("/api/purchases",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

serviceType:"esim",

network:selected!.network,

phone:"na",

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

setPinMode(false);

return;

}



setIssued({

token:data.token,

txnId:data.txnId

});


}





if(issued){

return (

<main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">


<div className="rounded-3xl bg-white border border-indigo/10 p-8 max-w-sm">

<div className="text-5xl mb-4">
🌍
</div>


<h1 className="font-heading text-2xl font-bold text-indigo">
Your eSIM is ready
</h1>


<p className="text-sm text-indigo/60 mt-2 mb-6">
Scan the QR code to activate your travel data.
</p>



<QrCode
value={esimLpaString(issued.token)}
size={220}
/>



<div className="mt-6 space-y-3">

<Link
href={`/esim/${issued.txnId}`}
className="block rounded-xl bg-indigo text-white py-3 font-semibold"
>
Manage eSIM
</Link>


<Link
href="/esim"
className="block rounded-xl border border-indigo/20 py-3 font-semibold text-indigo"
>
My eSIMs
</Link>

</div>


</div>

</main>

);

}





if(pinMode){

return (

<main className="min-h-screen bg-background flex items-center justify-center px-6">


<div className="w-full max-w-xs text-center">

<h1 className="font-heading text-xl font-bold text-indigo">
Confirm purchase
</h1>


<p className="text-sm text-indigo/60 mb-8">
Enter PIN to activate your eSIM
</p>


<PinPad
value={pin}
onChange={setPin}
onComplete={submit}
/>


{loading &&
<p className="mt-4 text-sm text-indigo/50">
Processing...
</p>
}


{error &&
<p className="mt-4 text-sm text-red-600">
{error}
</p>
}


<button
onClick={()=>setPinMode(false)}
className="mt-5 underline text-sm"
>
Cancel
</button>


</div>

</main>

);

}





return (

<main className="min-h-screen bg-background">


<PageHeader
title="Buy eSIM"
backHref="/home"
right={
<Link
href="/esim"
className="text-sm font-semibold text-konek-green"
>
My eSIMs
</Link>
}
/>



<div className="max-w-lg mx-auto px-5 py-6">


<div className="rounded-3xl bg-indigo text-white p-6 mb-6">

<p className="text-xs uppercase text-white/60">
Global connectivity
</p>

<h1 className="text-2xl font-bold mt-2">
Internet anywhere you travel 🌍
</h1>


<p className="text-sm text-white/70 mt-3">
Instant data plans without changing your SIM.
</p>

</div>





<div className="flex gap-2 mb-6">

{TABS.map(t=>(

<button

key={t.id}

onClick={()=>{

setTab(t.id);

setSelected(null);

}}

className={`flex-1 rounded-xl py-3 text-sm font-semibold ${
tab===t.id
?
"bg-indigo text-white"
:
"bg-indigo/10 text-indigo"
}`}

>

{t.label}

</button>

))}

</div>





<div className="space-y-3">

{filtered.map(plan=>{


const gb =
plan.meta?.dataMb
?
plan.meta.dataMb / 1000
:
0;


return (

<button

key={plan.id}

onClick={()=>setSelected(plan)}

className={`w-full rounded-2xl bg-white border p-4 text-left flex justify-between ${
selected?.id===plan.id
?
"border-konek-green bg-konek-green/10"
:
"border-indigo/10"
}`}

>


<div className="flex gap-3">

<span className="text-3xl">
{plan.meta?.flag ?? "🌐"}
</span>


<div>

<p className="font-bold text-indigo">
{plan.meta?.place ?? plan.name}
</p>


<p className="text-xs text-indigo/50">
{gb}GB · {plan.meta?.validityDays} days
</p>


</div>


</div>



<p className="font-bold text-indigo">
{usd(Number(plan.price_minor))}
</p>


</button>

);

})}

</div>





<button

onClick={buy}

className="mt-8 w-full rounded-2xl bg-indigo text-white py-4 font-semibold"

>

Buy eSIM

</button>



{error &&
<p className="mt-4 text-red-600 text-sm">
{error}
</p>
}


</div>


</main>

);

}



export default function BuyEsimPage(){

return (

<Suspense>

<BuyEsim/>

</Suspense>

);

}

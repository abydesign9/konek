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



export default function GiftCardPage(){

const router = useRouter();


const [plans,setPlans]=useState<Plan[]>([]);

const [selected,setSelected]=useState<Plan|null>(null);

const [email,setEmail]=useState("");

const [pin,setPin]=useState("");

const [showPin,setShowPin]=useState(false);

const [error,setError]=useState("");

const [success,setSuccess]=useState(false);

const [loading,setLoading]=useState(false);



useEffect(()=>{

fetch("/api/catalog?serviceType=gift_card")
.then(r=>r.json())
.then(d=>setPlans(d.plans ?? []));

},[]);




function proceed(){

if(!selected){

setError("Select a gift card");

return;

}

if(!email){

setError("Enter recipient email");

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

serviceType:"gift_card",

network:selected!.network,

phone:email,

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

<div className="bg-white rounded-3xl border p-8 text-center">

<div className="text-5xl mb-4">
🎁
</div>

<h1 className="text-xl font-bold text-indigo">
Gift Card Purchased
</h1>

<p className="text-sm text-indigo/60 mt-3">
Gift card sent successfully.
</p>


<button
onClick={()=>router.push("/wallet")}
className="mt-6 rounded-xl bg-indigo text-white px-8 py-3 font-semibold"
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
Confirm Gift Card
</h1>

<PinPad
value={pin}
onChange={setPin}
onComplete={submit}
/>

{loading &&
<p className="text-center text-sm mt-4">
Processing...
</p>
}

{error &&
<p className="text-center text-red-600 text-sm mt-4">
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
title="Gift Card"
backHref="/home"
/>


<div className="max-w-lg mx-auto px-5 py-6">


<p className="text-sm text-indigo/60 mb-5">
Buy digital gift cards instantly.
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

value={email}

onChange={e=>setEmail(e.target.value)}

placeholder="Recipient email"

className="w-full rounded-xl border px-4 py-3 mt-5"

/>



<button

onClick={proceed}

className="mt-6 w-full rounded-xl bg-indigo text-white py-3 font-semibold"

>
Continue
</button>


{error &&
<p className="mt-3 text-red-600 text-sm">
{error}
</p>
}


</div>


</main>

);

}

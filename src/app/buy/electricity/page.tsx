"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";


const PROVIDERS = [
  "IKEDC",
  "EKEDC",
  "AEDC",
  "PHED",
  "IBEDC"
];


const AMOUNTS = [
  100000,
  200000,
  500000,
  1000000
];


function money(minor:number){

  return `₦${(minor / 100).toLocaleString()}`;

}



export default function ElectricityPage(){

const router = useRouter();


const [provider,setProvider] =
useState("");

const [meter,setMeter] =
useState("");

const [meterType,setMeterType] =
useState<"prepaid"|"postpaid">("prepaid");

const [amount,setAmount] =
useState<number|null>(null);

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



function proceed(){

if(!provider){

setError("Select electricity provider");
return;

}


if(!meter){

setError("Enter meter number");
return;

}


if(!amount){

setError("Select amount");
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

serviceType:"electricity",

network:provider,

phone:meter,

amountMinor:amount,

pin:finalPin,

idempotencyKey:crypto.randomUUID(),

recipientExtra:{
meterType
}

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

<div className="rounded-3xl bg-white border p-8 text-center">


<div className="text-5xl mb-4">
⚡
</div>


<h1 className="text-xl font-bold text-indigo">
Electricity Payment Successful
</h1>


<p className="text-sm text-indigo/60 mt-3">

{provider} {meterType} meter payment completed.

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


<h1 className="text-center text-lg font-bold text-indigo mb-5">

Confirm Electricity Payment

</h1>


<p className="text-center text-sm text-indigo/60 mb-5">

{provider} · {money(amount ?? 0)}

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

title="Electricity"

backHref="/home"

/>



<div className="max-w-lg mx-auto px-5 py-6">


<p className="text-sm text-indigo/60 mb-6">

Pay electricity bills instantly from your Konek wallet.

</p>




<div className="grid grid-cols-2 gap-3 mb-5">


{PROVIDERS.map(item=>(

<button

key={item}

onClick={()=>setProvider(item)}

className={`rounded-xl py-3 font-semibold ${
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





<div className="grid grid-cols-2 gap-3 mb-5">


<button

onClick={()=>setMeterType("prepaid")}

className={`rounded-xl py-3 font-semibold ${
meterType==="prepaid"
?
"bg-konek-green/20 border border-konek-green"
:
"bg-white border"
}`}

>

Prepaid

</button>



<button

onClick={()=>setMeterType("postpaid")}

className={`rounded-xl py-3 font-semibold ${
meterType==="postpaid"
?
"bg-konek-green/20 border border-konek-green"
:
"bg-white border"
}`}

>

Postpaid

</button>


</div>





<input

value={meter}

onChange={(e)=>setMeter(e.target.value)}

placeholder="Meter number"

className="w-full rounded-xl border px-4 py-3 mb-5"

/>





<div className="grid grid-cols-2 gap-3">


{AMOUNTS.map(item=>(

<button

key={item}

onClick={()=>setAmount(item)}

className={`rounded-xl border py-3 font-semibold ${
amount===item
?
"border-konek-green bg-konek-green/10"
:
"bg-white"
}`}

>

{money(item)}

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

<p className="mt-3 text-sm text-red-600">

{error}

</p>

)}



</div>


</main>

);

}

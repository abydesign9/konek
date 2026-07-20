"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";


const NETWORKS = [
  "MTN",
  "Airtel",
  "Glo",
  "9mobile"
];


const AMOUNTS = [
  10000,
  50000,
  100000,
  200000
];


function naira(minor:number){

return `₦${(minor/100).toLocaleString()}`;

}



export default function AirtimePage(){


const router = useRouter();


const [network,setNetwork] =
useState("");

const [phone,setPhone] =
useState("");

const [amount,setAmount] =
useState<number|null>(null);

const [custom,setCustom] =
useState("");

const [showPin,setShowPin] =
useState(false);

const [pin,setPin] =
useState("");

const [loading,setLoading] =
useState(false);

const [error,setError] =
useState("");

const [success,setSuccess] =
useState(false);





const finalAmount =
amount ??
(custom
?
Number(custom)*100
:
null);





function continuePurchase(){

if(!network){

setError("Select a network");

return;

}


if(!/^0\d{10}$/.test(phone)){

setError("Enter a valid phone number");

return;

}


if(!finalAmount || finalAmount < 10000){

setError("Minimum amount is ₦100");

return;

}


setError("");

setShowPin(true);

}





async function submit(finalPin:string){

setLoading(true);

setError("");



const res =
await fetch("/api/purchases",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

serviceType:"airtime",

network,

phone,

amountMinor:finalAmount,

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
Airtime Successful
</h1>


<p className="text-sm text-indigo/60 mt-3">
{network} airtime sent to {phone}
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

<main className="min-h-screen bg-background px-6 py-8 flex items-center justify-center">


<div className="max-w-xs w-full">


<h1 className="text-lg font-bold text-indigo text-center mb-2">
Confirm Airtime
</h1>


<p className="text-sm text-indigo/60 text-center mb-6">

{network} · {naira(finalAmount ?? 0)}

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
title="Buy Airtime"
backHref="/home"
/>



<div className="max-w-lg mx-auto px-5 py-6">


<p className="text-sm text-indigo/60 mb-6">
Instant mobile recharge from your Konek wallet.
</p>



<div className="grid grid-cols-4 gap-2 mb-6">


{NETWORKS.map((item)=>(

<button

key={item}

onClick={()=>setNetwork(item)}

className={`rounded-xl py-3 text-sm font-semibold ${
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

inputMode="numeric"

className="w-full rounded-xl border px-4 py-3 mb-5"

/>





<div className="grid grid-cols-2 gap-3">


{AMOUNTS.map((item)=>(

<button

key={item}

onClick={()=>{

setAmount(item);

setCustom("");

}}

className={`rounded-xl border py-3 font-semibold ${
amount===item
?
"border-konek-green bg-konek-green/10"
:
"border-indigo/20"
}`}

>

{naira(item)}

</button>

))}


</div>




<input

value={custom}

onChange={(e)=>{

setCustom(e.target.value);

setAmount(null);

}}

placeholder="Custom amount"

inputMode="numeric"

className="w-full rounded-xl border px-4 py-3 mt-4"

/>



<button

onClick={continuePurchase}

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

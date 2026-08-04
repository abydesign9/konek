"use client";

import { redirectIfKycGate } from "@/lib/kyc/gateRedirect";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PinPad } from "@/components/PinPad";


const COUNTRIES = [
  "USA",
  "UK",
  "Canada",
  "Ghana",
  "South Africa"
];


const AMOUNTS = [
  50000,
  100000,
  200000,
  500000
];


function money(minor:number){

  return `₦${(minor / 100).toLocaleString()}`;

}



export default function IntlTopupPage(){

const router = useRouter();


const [country,setCountry] =
useState("");

const [phone,setPhone] =
useState("");

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

if(!country){

setError("Select destination country");

return;

}


if(!phone){

setError("Enter recipient number");

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

serviceType:"intl_topup",

network:country,

phone,

amountMinor:amount,

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


<div className="rounded-3xl bg-white border p-8 text-center">


<div className="text-5xl mb-4">
🌍
</div>


<h1 className="text-xl font-bold text-indigo">
International Top-up Successful
</h1>


<p className="text-sm text-indigo/60 mt-3">

Top-up sent to {country} number.

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

Confirm International Top-up

</h1>


<p className="text-center text-sm text-indigo/60 mb-5">

{country} · {money(amount ?? 0)}

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

title="International Top-up"

backHref="/home"

/>



<div className="max-w-lg mx-auto px-5 py-6">


<p className="text-sm text-indigo/60 mb-6">

Send mobile credit internationally from your Konek wallet.

</p>





<div className="grid grid-cols-2 gap-3 mb-5">


{COUNTRIES.map(item=>(

<button

key={item}

onClick={()=>setCountry(item)}

className={`rounded-xl py-3 font-semibold ${
country===item
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

placeholder="International phone number"

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

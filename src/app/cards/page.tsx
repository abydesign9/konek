"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

interface CardTransaction {
  id:string;
  merchant_name:string;
  amount_minor:string;
  status:string;
  created_at:string;
}

interface Card {
  id:string;
  brand:string;
  last4:string;
  status:string;
  currency:string;
  single_txn_limit_minor:number|null;
  monthly_limit_minor:number|null;
  merchant_lock:string|null;
  transactions:CardTransaction[];
}

interface CardResponse {
  cards:Card[];
  balanceMinor:number;
}

interface CardDetails {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
}


export default function CardsPage(){

const [data,setData] =
useState<CardResponse|null>(null);

const [loading,setLoading] =
useState(false);

const [details,setDetails] =
useState<CardDetails | null>(null);

const [error,setError] =
useState<string|null>(null);


async function issueCard(){

setLoading(true);
setError(null);

const res =
await fetch("/api/cards/issue",{ method:"POST" });

const json =
await res.json().catch(()=>({}));

setLoading(false);

if(!res.ok){

if(json.code==="no_dollar_account"){
setError("Create your USD account first, then come back to add a card.");
return;
}

if(res.status===403){
setError("Cards need finance verification (identity + liveness).");
return;
}

setError(json.error ?? "Could not create card");
return;

}

load();

}


async function load(){

const res =
await fetch("/api/cards/me");

const json =
await res.json();

setData(json);

}


useEffect(()=>{

load();

},[]);



async function freeze(card:Card){

setLoading(true);

await fetch(
`/api/cards/${card.id}/freeze`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
frozen:card.status==="active"
})
}
);

setLoading(false);

load();

}




async function reveal(card:Card){

const res =
await fetch(
`/api/cards/${card.id}/reveal`,
{
method:"POST"
}
);

const json =
await res.json();

setDetails(json);

}




if(!data){

return (

<main className="min-h-screen bg-background flex items-center justify-center">

<p className="text-indigo/50">
Loading cards...
</p>

</main>

);

}




const card =
data.cards[0];




return (

<main className="min-h-screen bg-background pb-28">


<PageHeader
title="Virtual Card"
backHref="/wallet"
/>


<div className="max-w-lg mx-auto px-5 py-6">


{!card ? (

<div className="rounded-3xl bg-white border border-indigo/10 p-8 text-center">


<div className="text-5xl mb-4">
💳
</div>


<h2 className="font-bold text-indigo text-xl">
No card yet
</h2>


<p className="text-sm text-indigo/60 mt-2">
Create a virtual card to spend online worldwide.
</p>


<button
onClick={issueCard}
disabled={loading}
className="mt-6 w-full rounded-2xl bg-indigo text-white py-3.5 font-semibold disabled:opacity-50"
>
{loading ? "Creating…" : "Create Card"}
</button>


{error && (
<p className="mt-4 text-sm text-red-600">
{error}
</p>
)}


{error && error.startsWith("Create your USD") && (
<a
href="/wallet/dollar-account"
className="mt-3 inline-block text-sm font-semibold text-konek-green"
>
Open USD account →
</a>
)}


</div>


) : (

<>


<div className="rounded-3xl bg-indigo text-white p-6 mb-6">


<p className="text-xs text-white/60">
Konek Virtual Card
</p>


<h2 className="text-2xl font-bold mt-4">
{card.brand}
</h2>


<p className="mt-8 text-xl tracking-widest">
•••• •••• •••• {card.last4}
</p>


<div className="flex justify-between mt-6 text-sm">

<span>
{card.currency}
</span>

<span>
{card.status}
</span>

</div>


</div>





<div className="rounded-3xl bg-white border border-indigo/10 p-5 mb-5">


<p className="text-xs text-indigo/50">
Card balance
</p>


<p className="text-3xl font-bold text-indigo mt-2">

{card.currency==="USD"?"$":"₦"}

{(data.balanceMinor/100).toLocaleString()}

</p>


</div>





<div className="grid grid-cols-2 gap-3 mb-6">


<button

onClick={()=>freeze(card)}

disabled={loading}

className="rounded-2xl bg-indigo text-white py-3 font-semibold"

>

{card.status==="active"
?"Freeze"
:"Unfreeze"}

</button>



<button

onClick={()=>reveal(card)}

className="rounded-2xl bg-white border border-indigo/20 text-indigo py-3 font-semibold"

>

Reveal

</button>


</div>





<div className="rounded-3xl bg-white border border-indigo/10 p-5">


<h3 className="font-bold text-indigo mb-4">
Recent Card Activity
</h3>


{card.transactions.length===0 && (

<p className="text-sm text-indigo/50">
No card transactions yet.
</p>

)}



{card.transactions.map((tx)=>(

<div
key={tx.id}
className="flex justify-between py-3 border-b border-indigo/10"
>


<div>

<p className="font-semibold text-sm text-indigo">
{tx.merchant_name}
</p>


<p className="text-xs text-indigo/50">
{tx.status}
</p>

</div>


<p className="font-bold text-indigo">

{card.currency==="USD"?"$":"₦"}

{(Number(tx.amount_minor)/100).toLocaleString()}

</p>


</div>

))}


</div>




{details && (

<div className="mt-5 rounded-3xl bg-konek-green/10 p-5">

<p className="font-bold text-indigo">
Card Details
</p>

<p className="mt-2 text-sm text-indigo">
Number: {details.cardNumber}
</p>

<p className="text-sm text-indigo">
Expiry: {details.expiry}
</p>

<p className="text-sm text-indigo">
CVV: {details.cvv}
</p>

</div>

)}


</>

)}


</div>


</main>

);

}

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

interface CardProduct {
  id: string;
  name: string;
  currency: string;
  formFactor: "virtual" | "physical";
  brand: string;
  description: string | null;
  creationFeeMinor: number;
  authorizationFeeMinor: number;
  fundingFeePct: number;
  fundingFeeMinMinor: number;
  fundingFeeMaxMinor: number | null;
  declineFeeMinor: number;
  disputeFeeMinor: number;
  intlFeePct: number;
  intlFeeFixedMinor: number;
}

function fx(minor: number, ccy: string) {
  return `${ccy === "USD" ? "$" : "₦"}${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: minor % 100 ? 2 : 0 })}`;
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

const [verified,setVerified] =
useState<boolean|null>(null);

const [products,setProducts] = useState<CardProduct[]>([]);
const [selectedId,setSelectedId] = useState<string|null>(null);


async function issueCard(){

if(!selectedId){ setError("Choose a card type first."); return; }

setLoading(true);
setError(null);

const res =
await fetch("/api/cards/issue",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body: JSON.stringify({ productId: selectedId }),
});

const json =
await res.json().catch(()=>({}));

setLoading(false);

if(!res.ok){

if(json.code==="no_dollar_account"){
setError("Create the matching account first (USD or Naira), then come back.");
return;
}

if(json.code==="fee_unpaid"){
setError("Your wallet balance can't cover the card creation fee.");
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

fetch("/api/verification/status")
.then((r)=>r.json())
.then((d)=>setVerified((d.tier ?? 0) >= 2))
.catch(()=>setVerified(false));

fetch("/api/cards/products")
.then((r)=>r.json())
.then((d)=>{
const list: CardProduct[] = d.products ?? [];
setProducts(list);
setSelectedId((cur)=> cur ?? list[0]?.id ?? null);
})
.catch(()=>{});

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

const selected = products.find((p)=>p.id===selectedId) ?? null;




return (

<main className="min-h-screen bg-background pb-28">


<PageHeader
title="Virtual Card"
backHref="/wallet"
/>


<div className="max-w-lg mx-auto px-5 py-6">


{!card ? (

<div className="rounded-3xl bg-white border border-indigo/10 p-6">


<div className="text-center">
<div className="text-5xl mb-3">💳</div>
<h2 className="font-bold text-indigo text-xl">Create a card</h2>
<p className="text-sm text-indigo/60 mt-2">Choose a card type. Fees are shown up front.</p>
</div>

{/* Card type picker */}
<div className="konek-scrollbar-none mt-5 flex gap-2 overflow-x-auto">
{products.map((p)=>(
<button
key={p.id}
onClick={()=>setSelectedId(p.id)}
className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${selectedId===p.id?"bg-indigo text-white":"border border-indigo/15 bg-white text-indigo"}`}
>
{p.name}
</button>
))}
</div>

{/* Fee schedule for the selected product */}
{selected && (
<div className="mt-4 rounded-2xl border border-indigo/10 bg-white">
<div className="border-b border-indigo/10 px-4 py-3">
<p className="font-bold text-indigo">{selected.name}</p>
<p className="text-xs text-indigo/55">{selected.currency} · {selected.formFactor} · {selected.brand}{selected.description?` · ${selected.description}`:""}</p>
</div>
<div className="divide-y divide-indigo/5 text-sm">
<FeeLine label="Card creation fee" value={fx(selected.creationFeeMinor,selected.currency)} />
<FeeLine label="Card authorization fee" hint="Applies on every card transaction" value={fx(selected.authorizationFeeMinor,selected.currency)} />
<FeeLine label="Card funding fee" hint={selected.fundingFeePct?undefined:"No fee — the card is linked to your wallet"} value={selected.fundingFeePct?`${selected.fundingFeePct}%${selected.fundingFeeMinMinor?` · min ${fx(selected.fundingFeeMinMinor,selected.currency)}`:""}${selected.fundingFeeMaxMinor?` · max ${fx(selected.fundingFeeMaxMinor,selected.currency)}`:""}`:fx(0,selected.currency)} />
<FeeLine label="Card decline fee" hint="Applies on declines due to insufficient balance" value={fx(selected.declineFeeMinor,selected.currency)} />
<FeeLine label="Dispute fee" hint="Applies when you file a card dispute" value={fx(selected.disputeFeeMinor,selected.currency)} />
<FeeLine label="International transaction fee" hint="Applies on non-US / international websites" value={`${selected.intlFeePct?`${selected.intlFeePct}%`:""}${selected.intlFeePct&&selected.intlFeeFixedMinor?" + ":""}${selected.intlFeeFixedMinor?fx(selected.intlFeeFixedMinor,selected.currency):(!selected.intlFeePct?fx(0,selected.currency):"")}`} />
</div>
</div>
)}

{/* Wallet balance + verification */}
<div className="mt-3 flex items-center justify-between rounded-2xl border border-indigo/10 px-4 py-3">
<span className="text-sm text-indigo/60">Wallet balance</span>
<span className="text-sm font-bold text-indigo">${(data.balanceMinor/100).toLocaleString()}</span>
</div>
<div className="mt-3 rounded-2xl border border-indigo/10 px-4 py-3">
<p className="mb-1.5 text-xs text-indigo/50">User verification</p>
{verified === null ? (
<span className="inline-block rounded-full bg-indigo/10 px-3 py-1 text-xs font-semibold text-indigo/60">Checking…</span>
) : verified ? (
<span className="inline-block rounded-full bg-konek-green/15 px-3 py-1 text-xs font-semibold text-konek-green">✓ Verified</span>
) : (
<a href="/kyc" className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">Not verified · Verify →</a>
)}
</div>

<button
onClick={issueCard}
disabled={loading || verified === false || !selected}
className="mt-5 w-full rounded-2xl bg-indigo text-white py-3.5 font-semibold disabled:opacity-50"
>
{loading ? "Creating…" : verified === false ? "Verify to create a card" : selected ? `Create ${selected.name}` : "Create Card"}
</button>

{error && (
<p className="mt-4 text-sm text-red-600">
{error}
</p>
)}

{error && error.includes("account first") && (
<a href={selected?.currency==="NGN"?"/wallet/naira-account":"/wallet/dollar-account"} className="mt-3 inline-block text-sm font-semibold text-konek-green">
Open {selected?.currency==="NGN"?"Naira":"USD"} account →
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


<a
href={`/cards/${card.id}`}
className="mb-6 block rounded-2xl bg-white border border-indigo/20 text-indigo text-center py-3 font-semibold"
>
Card settings — limits &amp; merchant lock
</a>





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

function FeeLine({ label, hint, value }: { label: string; hint?: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-indigo">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-indigo/45">{hint}</p>}
      </div>
      <p className="shrink-0 text-sm font-semibold text-indigo">{value}</p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import ShareAccountDetails from "@/components/ShareAccountDetails";
import KycGate from "@/components/KycGate";

type Currency = "USD" | "GBP" | "EUR";

interface Account {
  id: string;
  currency: Currency;
  account_number: string;
  routing_number: string | null;
  bank_name: string;
  status: string;
  balanceMinor: number;
  inflows: {
    sender_name: string;
    sender_bank: string;
    amount_minor: string;
    currency: string;
    status: string;
    received_at: string;
  }[];
}

interface GlobalAccountData {
  accounts: Account[];
}


export default function GlobalAccountPage({
  params,
}: {
  params: { currency: Currency };
}) {

return (

<KycGate
requirements={[
"BVN_VERIFIED",
"KYC_APPROVED"
]}
featureName="Global Account"
>

<GlobalAccountContent params={params}/>

</KycGate>

);

}



function GlobalAccountContent({
params,
}:{
params:{
currency:Currency
}
}) {


const currency =
params.currency.toUpperCase() as Currency;


const [data,setData] =
useState<GlobalAccountData|null>(null);


const [creating,setCreating] =
useState(false);


const [error,setError] =
useState("");



useEffect(()=>{

fetch("/api/dollar-account/me")
.then(r=>r.json())
.then(setData);

},[]);



const account =
data?.accounts.find(
a=>a.currency===currency
);



async function createAccount(){

setCreating(true);
setError("");

const res =
await fetch(
"/api/dollar-account/create",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
currency
})
}
);


const body =
await res.json().catch(()=>({}));

setCreating(false);


if(!res.ok){

setError(
body.error ??
"Unable to create account"
);

return;

}


location.reload();

}





if(!data){

return (

<main className="min-h-screen bg-background flex items-center justify-center">

<p className="text-indigo/50">
Loading account...
</p>

</main>

);

}



const symbol =
currency==="USD"
?
"$"
:
currency==="GBP"
?
"£"
:
"€";




return (

<main className="min-h-screen bg-background">


<PageHeader

title={`${currency} Account`}

backHref="/wallet/dollar-account"

/>



<div className="max-w-lg mx-auto px-5 py-6">



<div className="rounded-3xl bg-indigo text-white p-6 mb-6">


<p className="text-xs uppercase text-white/60">
raviion Global Account
</p>


<h1 className="text-2xl font-bold mt-2">
Receive {currency} worldwide 🌍
</h1>


<p className="text-sm text-white/70 mt-3">
Get paid by employers, clients and international businesses.
</p>


</div>





{!account && (

<div className="rounded-3xl bg-white border border-indigo/10 p-6">


<div className="text-4xl mb-4">
🏦
</div>


<h2 className="font-heading text-xl font-bold text-indigo">
Create your {currency} account
</h2>


<p className="text-sm text-indigo/60 mt-2 mb-6">
Receive salary, freelance payments and global transfers using your personal account details.
</p>



<button

onClick={createAccount}

disabled={creating}

className="w-full rounded-xl bg-indigo text-white py-3 font-semibold"

>

{creating
?
"Creating..."
:
`Create ${currency} Account`
}


</button>



{error && (

<p className="text-sm text-red-600 mt-3">
{error}
</p>

)}


</div>

)}






{account && (

<>


<div className="rounded-3xl bg-indigo text-white p-6 mb-6">


<p className="text-xs text-white/60">
Available Balance
</p>


<p className="text-4xl font-bold mt-2">

{symbol}
{(account.balanceMinor/100)
.toLocaleString(
undefined,
{
minimumFractionDigits:2
}
)}

</p>


</div>





<div className="rounded-3xl bg-white border border-indigo/10 p-5 mb-6">


<h3 className="font-bold text-indigo mb-4">
Account Details
</h3>


<ShareAccountDetails

currency={currency}

bankName={account.bank_name}

accountNumber={account.account_number}

routingNumber={account.routing_number}

/>


</div>





<div className="rounded-3xl bg-white border border-indigo/10 p-5 mb-6">


<h3 className="font-bold text-indigo mb-3">
Why use this account?
</h3>


<div className="space-y-3 text-sm text-indigo/70">

<p>
✓ Receive international payments
</p>

<p>
✓ Get paid by clients and employers
</p>

<p>
✓ Manage your global money from raviion
</p>

<p>
✓ Spend through raviion services
</p>

</div>


</div>





<div className="rounded-3xl bg-white border border-indigo/10 p-5">


<h3 className="font-bold text-indigo mb-4">
Recent Payments
</h3>



{account.inflows.length===0 && (

<p className="text-sm text-indigo/50">
No incoming payments yet.
</p>

)}




{account.inflows.map((item,index)=>(


<div

key={index}

className="flex justify-between py-3 border-b border-indigo/10 last:border-0"

>


<div>

<p className="font-semibold text-indigo text-sm">
{item.sender_name}
</p>


<p className="text-xs text-indigo/50">
{item.sender_bank}
</p>

</div>



<p className="font-bold text-raviion-green">

+
{(Number(item.amount_minor)/100)
.toLocaleString()}

</p>


</div>


))}


</div>





<div className="mt-6 rounded-3xl bg-raviion-green/10 p-5">


<p className="font-bold text-indigo">
Need your money in Nigeria?
</p>


<p className="text-sm text-indigo/60 mt-1 mb-4">
Withdraw to your verified Nigerian bank account.
</p>


<Link

href="/wallet/withdraw"

className="block text-center rounded-xl bg-indigo text-white py-3 font-semibold"

>

Withdraw

</Link>


</div>



</>

)}



</div>


</main>

);

}

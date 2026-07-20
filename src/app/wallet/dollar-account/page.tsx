"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
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



const currencies: {
  code: Currency;
  flag: string;
}[] = [

  {
    code: "USD",
    flag: "🇺🇸",
  },

  {
    code: "GBP",
    flag: "🇬🇧",
  },

  {
    code: "EUR",
    flag: "🇪🇺",
  },

];




function CopyRow({

  label,

  value,

}: {

  label:string;

  value:string;

}) {


  const [copied,setCopied] =
    useState(false);



  return (

    <button

      className="w-full flex justify-between py-3 border-b border-indigo/10"

      onClick={() => {

        navigator.clipboard.writeText(value);

        setCopied(true);

        setTimeout(
          () => setCopied(false),
          1200
        );

      }}

    >

      <span>

        <span className="block text-xs text-indigo/50">
          {label}
        </span>

        <span className="font-mono text-sm text-indigo">
          {value}
        </span>

      </span>


      <span className="text-xs text-konek-green">

        {copied ? "Copied" : "Copy"}

      </span>


    </button>

  );

}





function GlobalAccountContent(){

const [data,setData] =
useState<GlobalAccountData|null>(null);


const [selected,setSelected] =
useState<Currency>("USD");


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
(a)=>a.currency===selected
);



async function createAccount(){


setCreating(true);


const res =
await fetch(
"/api/dollar-account/create",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
currency:selected
})
}
);


const body =
await res.json();


setCreating(false);



if(!res.ok){

setError(
body.error ??
"Unable to create account"
);

return;

}



setData(prev=>

prev
?
{
...prev,
accounts:[
...prev.accounts,
body
]
}
:
prev

);


}




if(!data)

return null;



return (

<main className="min-h-screen bg-background">


<PageHeader
title="Global Accounts"
backHref="/home"
/>



<div className="max-w-lg mx-auto px-5 py-6">



<p className="text-sm text-indigo/60 mb-6">

Receive USD, GBP and EUR payments.
Your verified global account can receive
salary, freelance and business payments.

</p>




<div className="rounded-2xl bg-white border p-5 mb-6">


<p className="font-bold text-indigo mb-4">

Choose currency

</p>



<div className="flex gap-2">

{currencies.map(c=>(

<button

key={c.code}

onClick={()=>setSelected(c.code)}

className={`flex-1 rounded-xl py-3 ${
selected===c.code
?
"bg-indigo text-white"
:
"bg-indigo/10 text-indigo"
}`}

>

{c.flag}

<br/>

{c.code}

</button>

))}


</div>


</div>





{!account && (

<div className="rounded-2xl bg-white border p-5">


<p className="font-bold text-indigo mb-3">

Create {selected} account

</p>


<p className="text-sm text-indigo/60 mb-5">

Get your virtual account details
to receive international payments.

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
`Create ${selected} account`
}


</button>



{error && (

<p className="text-red-600 text-sm mt-3">

{error}

</p>

)}


</div>

)}





{account && (

<>


<div className="rounded-2xl bg-indigo text-white p-6 mb-5">

<p className="text-xs text-white/60">

{selected} Balance

</p>


<p className="text-3xl font-bold">

{selected==="USD"&&"$"}

{selected==="GBP"&&"£"}

{selected==="EUR"&&"€"}

{(account.balanceMinor/100)
.toLocaleString()}

</p>


</div>




<div className="rounded-2xl bg-white border p-5">


<p className="font-bold text-indigo mb-3">

Receive payments

</p>


<CopyRow
label="Account Number"
value={account.account_number}
/>



{account.routing_number &&

<CopyRow

label="Routing Number"

value={account.routing_number}

/>

}



<CopyRow

label="Bank"

value={account.bank_name}

/>


</div>


</>

)}


</div>


</main>

);


}



export default function DollarAccountPage(){


return (

<KycGate

requirements={[
"BVN_VERIFIED",
"KYC_APPROVED"
]}

featureName="Global Account"

>

<GlobalAccountContent />

</KycGate>

);


}

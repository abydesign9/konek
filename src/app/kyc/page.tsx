"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";


interface KycStatus {
  tier:number;
  status:string;
  bvnVerified:boolean;
  ninVerified:boolean;
}



export default function KycPage(){

const [status,setStatus] =
useState<KycStatus|null>(null);



useEffect(()=>{

fetch("/api/verification/status")
.then(res=>res.json())
.then(setStatus);

},[]);



if(!status){

return (

<main className="min-h-screen bg-background flex items-center justify-center">

<p className="text-indigo/50">
Loading verification...
</p>

</main>

);

}



const progress =
status.tier >= 2
?
100
:
status.tier >= 1
?
60
:
20;



return (

<main className="min-h-screen bg-background pb-28">


<PageHeader
title="Verification"
backHref="/home"
/>



<div className="max-w-lg mx-auto px-5 py-6">


<div className="rounded-3xl bg-indigo text-white p-6 mb-6">


<p className="text-sm text-white/60">
Your Konek verification
</p>


<h1 className="text-2xl font-bold mt-2">
Secure your account
</h1>


<div className="mt-5 h-3 bg-white/20 rounded-full overflow-hidden">

<div
className="h-full bg-konek-green"
style={{
width:`${progress}%`
}}
/>

</div>


<p className="text-xs text-white/70 mt-2">
{progress}% completed
</p>


</div>





<div className="space-y-4">



<div className="rounded-3xl bg-white border p-5">

<h2 className="font-bold text-indigo">
Tier 0 — Browse
</h2>

<p className="text-sm text-indigo/60 mt-2">
Explore Konek services and manage your account.
</p>

</div>





<div className="rounded-3xl bg-white border p-5">


<div className="flex justify-between">

<h2 className="font-bold text-indigo">
Tier 1 — Verified Identity
</h2>


<span>
{status.tier >= 1 ? "✅":"🔒"}
</span>


</div>


<p className="text-sm text-indigo/60 mt-2">
Verify your BVN or NIN to unlock wallet funding, airtime, data and eSIM purchases.
</p>



{status.tier < 1 && (

<Link
href="/kyc/bvn"
className="inline-block mt-4 rounded-xl bg-indigo text-white px-5 py-2 font-semibold"
>
Verify Identity
</Link>

)}


</div>






<div className="rounded-3xl bg-white border p-5">


<div className="flex justify-between">

<h2 className="font-bold text-indigo">
Tier 2 — Full Finance
</h2>


<span>
{status.tier >= 2 ? "✅":"🔒"}
</span>


</div>



<p className="text-sm text-indigo/60 mt-2">
Unlock global accounts, virtual cards and advanced financial features.
</p>




{status.tier >= 2 ? (

<p className="mt-3 text-sm text-konek-green">
✅ Full Finance access enabled
</p>

) : (

<p className="mt-3 text-sm text-indigo/50">
Complete account verification to unlock more financial services.
</p>

)}



</div>





<div className="rounded-3xl bg-indigo/5 p-5">


<h3 className="font-bold text-indigo">
Security Protection
</h3>


<p className="text-sm text-indigo/60 mt-2">
Additional security checks may be requested when needed to protect your account.
</p>


</div>



</div>



</div>


</main>

);

}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";


interface VerificationStatus {

  tier:number;

  status:string;

  bvnVerified:boolean;

  ninVerified:boolean;

}



export default function KycStatusPage(){


const [data,setData] =
useState<VerificationStatus|null>(null);



useEffect(()=>{

fetch("/api/verification/status")
.then(res=>res.json())
.then(setData);

},[]);




if(!data){

return (

<main className="min-h-screen bg-background flex items-center justify-center">

<p className="text-indigo/50">
Loading verification...
</p>

</main>

);

}





return (

<main className="min-h-screen bg-background pb-28">


<PageHeader
title="Verification Status"
backHref="/kyc"
/>



<div className="max-w-lg mx-auto px-5 py-6">



<div className="rounded-3xl bg-indigo text-white p-6 mb-6">


<p className="text-sm text-white/60">
Current verification level
</p>


<h1 className="text-3xl font-bold mt-2">

Tier {data.tier}

</h1>


<p className="text-sm text-white/70 mt-2">

{data.status}

</p>


</div>





<div className="rounded-3xl bg-white border border-indigo/10 p-5 mb-5">


<h2 className="font-bold text-indigo mb-4">
Identity Verification
</h2>



<div className="flex justify-between py-3 border-b">

<span className="text-indigo/60">
BVN Verification
</span>


<span>
{data.bvnVerified ? "✅":"⭕"}
</span>


</div>




<div className="flex justify-between py-3">

<span className="text-indigo/60">
NIN Verification
</span>


<span>
{data.ninVerified ? "✅":"⭕"}
</span>


</div>


</div>







<div className="rounded-3xl bg-white border border-indigo/10 p-5">


<h2 className="font-bold text-indigo mb-4">
Your Access
</h2>



{data.tier >= 1 ? (

<div className="space-y-3 text-sm text-indigo">

<p>✅ Wallet funding</p>

<p>✅ Airtime and data purchases</p>

<p>✅ eSIM purchases</p>

</div>

) : (

<Link
href="/kyc/bvn"
className="block rounded-xl bg-indigo text-white text-center py-3 font-semibold"
>
Verify Identity
</Link>

)}





<div className="mt-6 pt-5 border-t">


<h3 className="font-bold text-indigo">
Tier 2 — Full Finance
</h3>


<p className="text-sm text-indigo/60 mt-2">
Unlock global accounts, virtual cards and advanced financial features.
</p>


{data.tier >= 2 && (

<p className="mt-3 text-sm">
✅ Tier unlocked
</p>

)}


</div>



</div>




</div>


</main>

);

}

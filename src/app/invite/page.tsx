"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";


const referrals = [
  {
    name:"John",
    status:"Completed KYC",
    reward:"₦1,000"
  },
  {
    name:"Sarah",
    status:"Pending verification",
    reward:"Pending"
  }
];



export default function InvitePage(){


const [copied,setCopied] =
useState(false);


const referralCode =
"KONEK12345";


const inviteLink =
`https://konek.app/signup?ref=${referralCode}`;



async function copyLink(){

await navigator.clipboard.writeText(inviteLink);

setCopied(true);

setTimeout(()=>setCopied(false),2000);

}



return (

<main className="min-h-screen bg-background pb-28">


<PageHeader

title="Invite & Earn"

backHref="/home"

/>



<div className="max-w-lg mx-auto px-5 py-6">



<div className="rounded-3xl bg-indigo text-white p-6 mb-5">


<p className="text-sm text-white/60">
Your referral code
</p>


<h1 className="text-3xl font-bold mt-2">
{referralCode}
</h1>


<p className="text-sm text-white/70 mt-3">
Invite friends and earn rewards when they join Konek.
</p>


</div>





<div className="rounded-3xl bg-white border border-indigo/10 p-5 mb-5">


<h2 className="font-bold text-indigo mb-4">
Share your invite
</h2>



<div className="rounded-xl bg-indigo/5 p-3 text-sm text-indigo/70 break-all mb-4">

{inviteLink}

</div>




<button

onClick={copyLink}

className="w-full rounded-xl bg-indigo text-white py-3 font-semibold"

>

{copied ? "Copied ✅" : "Copy Invite Link"}

</button>



</div>







<div className="grid grid-cols-2 gap-3 mb-5">


<div className="rounded-2xl bg-white border border-indigo/10 p-4">

<p className="text-xs text-indigo/50">
Successful referrals
</p>


<p className="text-2xl font-bold text-indigo mt-2">
12
</p>

</div>




<div className="rounded-2xl bg-white border border-indigo/10 p-4">

<p className="text-xs text-indigo/50">
Rewards earned
</p>


<p className="text-2xl font-bold text-indigo mt-2">
₦12,000
</p>

</div>


</div>







<div className="rounded-3xl bg-white border border-indigo/10 p-5">


<h2 className="font-bold text-indigo mb-4">
Referral History
</h2>



<div className="space-y-3">


{referrals.map(item=>(


<div

key={item.name}

className="flex justify-between items-center rounded-xl bg-indigo/5 p-3"

>


<div>

<p className="font-semibold text-indigo">
{item.name}
</p>


<p className="text-xs text-indigo/60">
{item.status}
</p>


</div>



<p className="font-bold text-konek-green">
{item.reward}
</p>


</div>


))}



</div>


</div>






<div className="mt-5 rounded-3xl bg-indigo/5 p-5">


<h3 className="font-bold text-indigo">
How rewards work
</h3>


<p className="text-sm text-indigo/60 mt-2">

Invite friends → They create an account → They complete identity verification → Both users receive rewards.

</p>


</div>




</div>


</main>

);

}

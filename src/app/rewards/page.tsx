"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";


const achievements = [
  {
    icon:"🎯",
    title:"First Wallet Funding",
    text:"Completed your first deposit"
  },
  {
    icon:"🌍",
    title:"Global User",
    text:"Used Konek international services"
  },
  {
    icon:"🔥",
    title:"Saving Streak",
    text:"Maintained your financial habit"
  }
];


const activities = [
  {
    title:"Cashback earned",
    amount:"+₦500",
    date:"Today"
  },
  {
    title:"Referral reward",
    amount:"+₦1,000",
    date:"Yesterday"
  },
  {
    title:"Transaction bonus",
    amount:"+₦200",
    date:"3 days ago"
  }
];



export default function RewardsPage(){


return (

<main className="min-h-screen bg-background pb-28">


<PageHeader

title="Rewards"

backHref="/home"

/>




<div className="max-w-lg mx-auto px-5 py-6">



<div className="rounded-3xl bg-indigo text-white p-6 mb-5">


<p className="text-sm text-white/60">
Your rewards balance
</p>


<h1 className="text-3xl font-bold mt-2">
2,450 Points
</h1>


<p className="text-sm text-white/70 mt-2">
Earn rewards every time you use Konek.
</p>



</div>







<div className="grid grid-cols-2 gap-3 mb-6">


<div className="rounded-2xl bg-white border border-indigo/10 p-4">

<p className="text-xs text-indigo/50">
Cashback earned
</p>

<p className="text-xl font-bold text-indigo mt-2">
₦1,700
</p>

</div>




<div className="rounded-2xl bg-white border border-indigo/10 p-4">

<p className="text-xs text-indigo/50">
Current streak
</p>

<p className="text-xl font-bold text-indigo mt-2">
🔥 7 days
</p>

</div>


</div>







<div className="rounded-3xl bg-white border border-indigo/10 p-5 mb-5">


<div className="flex justify-between items-center mb-4">

<h2 className="font-bold text-indigo">
Achievements
</h2>


<span className="text-sm text-indigo/50">
Badges
</span>

</div>




<div className="space-y-3">


{achievements.map(item=>(

<div

key={item.title}

className="flex items-center gap-3 rounded-xl bg-indigo/5 p-3"

>


<div className="text-2xl">
{item.icon}
</div>


<div>

<p className="font-semibold text-indigo">
{item.title}
</p>


<p className="text-xs text-indigo/60">
{item.text}
</p>


</div>


</div>

))}


</div>


</div>







<div className="rounded-3xl bg-white border border-indigo/10 p-5 mb-5">


<h2 className="font-bold text-indigo mb-4">
Reward Activity
</h2>



<div className="space-y-3">


{activities.map(item=>(

<div

key={item.title}

className="flex justify-between"

>


<div>

<p className="text-sm font-semibold text-indigo">
{item.title}
</p>


<p className="text-xs text-indigo/50">
{item.date}
</p>

</div>



<p className="font-bold text-konek-green">
{item.amount}
</p>


</div>

))}


</div>


</div>






<Link

href="/invite"

className="block rounded-2xl bg-indigo text-white text-center py-3.5 font-semibold"

>

Invite Friends & Earn Rewards →

</Link>





</div>


</main>

);

}

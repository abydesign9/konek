"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";


type Category =
  | "All"
  | "Transactions"
  | "Security"
  | "Rewards"
  | "Promotions";


const categories:Category[] = [
  "All",
  "Transactions",
  "Security",
  "Rewards",
  "Promotions"
];


const notifications = [

{
id:1,
category:"Transactions",
icon:"💰",
title:"Money Received",
message:"Your wallet was credited with ₦10,000.",
time:"Today",
read:false
},

{
id:2,
category:"Security",
icon:"🔐",
title:"New Login Detected",
message:"A new device signed into your Konek account.",
time:"Yesterday",
read:false
},

{
id:3,
category:"Rewards",
icon:"🎁",
title:"Referral Reward",
message:"You earned ₦1,000 referral bonus.",
time:"2 days ago",
read:true
},

{
id:4,
category:"Promotions",
icon:"📢",
title:"New Konek Feature",
message:"Explore new financial tools available.",
time:"3 days ago",
read:true
}

];



export default function NotificationsPage(){


const [active,setActive] =
useState<Category>("All");



const filtered =
notifications.filter(
(item)=>
active==="All" ||
item.category===active
);



return (

<main className="min-h-screen bg-background pb-28">


<PageHeader

title="Notifications"

backHref="/home"

/>



<div className="max-w-lg mx-auto px-5 py-6">



<div className="flex gap-2 overflow-x-auto mb-5">


{categories.map(item=>(

<button

key={item}

onClick={()=>setActive(item)}

className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
active===item
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







<div className="space-y-3">


{filtered.map(item=>(


<div

key={item.id}

className={`rounded-2xl border p-4 bg-white ${
item.read
?
"border-indigo/10"
:
"border-konek-green bg-konek-green/5"
}`}

>


<div className="flex gap-3">


<div className="text-2xl">

{item.icon}

</div>



<div className="flex-1">


<div className="flex justify-between gap-2">


<p className="font-semibold text-indigo">

{item.title}

</p>


{!item.read && (

<span className="h-2 w-2 rounded-full bg-konek-green mt-2"/>

)}


</div>



<p className="text-sm text-indigo/60 mt-1">

{item.message}

</p>


<p className="text-xs text-indigo/40 mt-2">

{item.time}

</p>



</div>


</div>


</div>


))}



</div>






<div className="mt-6 rounded-3xl bg-indigo/5 p-5">


<h3 className="font-bold text-indigo">
Notification Preferences
</h3>


<p className="text-sm text-indigo/60 mt-2">

Manage transaction alerts, security messages and promotional updates from your settings.

</p>


</div>




</div>


</main>

);

}

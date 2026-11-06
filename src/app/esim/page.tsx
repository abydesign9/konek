import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

interface EsimRow {
  id: string;
  token: string | null;
  recipient: {
    network?: string;
    planExternalId?: string;
  } | null;
  plan_meta: {
    place?: string;
    flag?: string;
    dataMb?: number;
    validityDays?: number;
  } | null;
  created_at: string;
}


export default async function MyEsimsPage(){

const userId =
await getSessionUserId();


if(!userId)
redirect("/login");



const {rows} =
await query<EsimRow>(

`SELECT 
 t.id,
 t.token,
 t.recipient,
 t.created_at,
 c.meta AS plan_meta

 FROM transactions t

 LEFT JOIN catalog_items c
 ON c.service_type='esim'
 AND c.external_id=t.recipient->>'planExternalId'

 WHERE t.user_id=$1
 AND t.type='esim'
 AND t.status='delivered'

 ORDER BY t.created_at DESC`,

[userId]

);



return (

<main className="min-h-screen bg-background">


<PageHeader

title="My eSIMs"

backHref="/home"

right={

<Link
href="/marketplace"
className="text-sm font-semibold text-raviion-green"
>
Buy
</Link>

}

/>



<div className="max-w-lg mx-auto px-5 py-6">


<div className="rounded-3xl bg-indigo text-white p-6 mb-7">


<p className="text-xs uppercase text-white/60">
raviion Global Connectivity
</p>


<h1 className="text-2xl font-bold mt-2">
Stay connected worldwide 🌍
</h1>


<p className="text-sm text-white/70 mt-3">
Manage your travel data packs from one place.
</p>


</div>





{rows.length===0 ? (

<div className="rounded-3xl bg-white border border-indigo/10 p-8 text-center">


<div className="text-5xl mb-4">
📶
</div>


<h2 className="font-bold text-indigo">
No active eSIM
</h2>


<p className="text-sm text-indigo/60 mt-2 mb-6">
Buy a travel data pack and connect instantly.
</p>



<Link

href="/marketplace"

className="inline-block rounded-xl bg-indigo text-white px-6 py-3 font-semibold"

>

Browse eSIM Packs

</Link>


</div>


):(


<div className="space-y-4">


{rows.map((item)=>(


<Link

key={item.id}

href={`/esim/${item.id}`}

className="block rounded-3xl bg-white border border-indigo/10 p-5 hover:border-indigo/30"

>


<div className="flex items-center justify-between">


<div className="flex items-center gap-3">


<div className="text-4xl">

{item.plan_meta?.flag ?? "🌍"}

</div>



<div>


<h2 className="font-bold text-indigo">

{item.plan_meta?.place ??
item.recipient?.network ??
"Global eSIM"}

</h2>



<p className="text-xs text-indigo/50">

Activated {formatDateTime(item.created_at)}

</p>


</div>


</div>



<span className="text-raviion-green font-semibold text-sm">

View →

</span>


</div>




<div className="mt-5 rounded-2xl bg-indigo/5 p-4">


<div className="flex justify-between text-sm">

<span className="text-indigo/60">
Data Package
</span>


<span className="font-bold text-indigo">

{item.plan_meta?.dataMb
?
(item.plan_meta.dataMb/1000).toFixed(1)+"GB"
:
"Data"}

</span>


</div>



<div className="flex justify-between text-sm mt-2">


<span className="text-indigo/60">
Validity
</span>


<span className="font-bold text-indigo">

{item.plan_meta?.validityDays ?? "-"} days

</span>


</div>


</div>



</Link>


))}


</div>


)}





<div className="mt-7 rounded-3xl border border-raviion-green/30 bg-raviion-green/5 p-5">


<h3 className="font-bold text-indigo">
Need more data?
</h3>


<p className="text-sm text-indigo/60 mt-1 mb-4">
Get another travel pack instantly.
</p>


<Link

href="/marketplace"

className="block text-center rounded-xl bg-indigo text-white py-3 font-semibold"

>

Buy New eSIM

</Link>


</div>



</div>


</main>

);

}

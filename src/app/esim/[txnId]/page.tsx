import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { QrCode } from "@/components/QrCode";
import { ShareReceiptButton } from "@/components/ShareReceiptButton";
import { esimLpaString } from "@/lib/esim";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

interface EsimTxn {
  token: string | null;
  status: string;
  recipient: {
    network?: string;
    planExternalId?: string;
  } | null;
  plan_name: string | null;
  plan_meta: {
    place?: string;
    flag?: string;
    dataMb?: number;
    validityDays?: number;
  } | null;
  created_at: string;
}


export default async function EsimUsagePage({
  params,
}: {
  params: { txnId: string };
}) {

const userId =
await getSessionUserId();


if(!userId)
redirect("/login");



const {rows} =
await query<EsimTxn>(

`SELECT 
t.token,
t.status,
t.recipient,
t.created_at,
c.name AS plan_name,
c.meta AS plan_meta

FROM transactions t

LEFT JOIN catalog_items c

ON c.service_type='esim'

AND c.external_id=t.recipient->>'planExternalId'

WHERE t.id=$1
AND t.user_id=$2
AND t.type='esim'`,

[params.txnId,userId]

);



const esim = rows[0];


if(!esim)
notFound();



if(esim.status!=="delivered"){

return (

<main className="min-h-screen bg-background flex items-center justify-center px-6 text-center">

<div>

<h1 className="font-bold text-indigo text-xl">
eSIM unavailable
</h1>


<p className="text-sm text-indigo/60 mt-2">
Your eSIM is still being prepared.
</p>


<Link
href="/esim"
className="inline-block mt-6 rounded-xl bg-indigo text-white px-6 py-3 font-semibold"
>
Back to eSIMs
</Link>

</div>

</main>

);

}




const totalMb =
esim.plan_meta?.dataMb ?? 5000;



const seed =
(esim.token ?? "")
.split("")
.reduce(
(a,c)=>a+c.charCodeAt(0),
0
);



const usedMb =
Math.min(seed % totalMb,totalMb);



const remaining =
totalMb-usedMb;


const percentage =
Math.round(
(remaining/totalMb)*100
);



const place =
esim.plan_meta?.place ??
esim.recipient?.network ??
"Global";





return (

<main className="min-h-screen bg-background">


<PageHeader

title="eSIM"

backHref="/esim"

backLabel="My eSIMs"

right={

<ShareReceiptButton

title="raviion eSIM"

text={`${place} eSIM · ${(totalMb/1000).toFixed(1)}GB`}

/>

}

/>



<div className="max-w-lg mx-auto px-5 py-6">





<div className="rounded-3xl bg-indigo text-white p-6 mb-6">


<div className="flex items-center gap-4">


<div className="text-5xl">

{esim.plan_meta?.flag ?? "🌍"}

</div>


<div>

<p className="text-xs text-white/60 uppercase">
Active eSIM
</p>


<h1 className="text-2xl font-bold">
{place}
</h1>


</div>


</div>



<div className="mt-6 flex justify-between">


<div>

<p className="text-xs text-white/60">
Remaining
</p>


<p className="text-3xl font-bold">
{(remaining/1000).toFixed(2)}GB
</p>


</div>



<div className="text-right">

<p className="text-xs text-white/60">
Validity
</p>


<p className="font-bold">
{esim.plan_meta?.validityDays ?? "-"} days
</p>


</div>


</div>



</div>







<div className="rounded-3xl bg-white border border-indigo/10 p-5 mb-5">


<div className="flex justify-between mb-3">

<p className="font-bold text-indigo">
Data usage
</p>


<p className="text-sm font-semibold text-indigo">
{percentage}%
</p>

</div>



<div className="h-3 rounded-full bg-indigo/10 overflow-hidden">

<div

className="h-full bg-raviion-green"

style={{
width:`${percentage}%`
}}

/>

</div>



<p className="text-xs text-indigo/50 mt-3">

{(usedMb/1000).toFixed(2)}GB used of {(totalMb/1000).toFixed(2)}GB

</p>


</div>







<div className="rounded-3xl bg-white border border-indigo/10 p-6 mb-5 text-center">


<h2 className="font-bold text-indigo mb-4">
Install your eSIM
</h2>



<QrCode

value={esimLpaString(esim.token ?? "")}

size={220}

/>



<p className="font-mono text-xs text-indigo/50 break-all mt-4">

{esim.token}

</p>


<p className="text-xs text-indigo/50 mt-3">

Activated {formatDateTime(esim.created_at)}

</p>


</div>







<div className="rounded-3xl bg-indigo/5 p-5 mb-5">


<h3 className="font-bold text-indigo">
How to activate
</h3>


<div className="text-sm text-indigo/70 mt-3 space-y-2">

<p>1. Open phone Settings</p>

<p>2. Select Mobile Network</p>

<p>3. Add eSIM</p>

<p>4. Scan the QR code above</p>

</div>


</div>








<Link

href="/marketplace"

className="block rounded-2xl bg-indigo text-white text-center py-4 font-semibold"

>

Buy more data

</Link>





</div>


</main>

);

}

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

const ACCOUNTS = [
  {
    currency: "USD",
    symbol: "$",
    flag: "🇺🇸",
    title: "US Dollar Account",
    description: "Receive payments from global clients, employers and businesses.",
  },
  {
    currency: "GBP",
    symbol: "£",
    flag: "🇬🇧",
    title: "British Pound Account",
    description: "Receive GBP payments and manage your international earnings.",
  },
  {
    currency: "EUR",
    symbol: "€",
    flag: "🇪🇺",
    title: "Euro Account",
    description: "Receive euro payments from Europe and global partners.",
  },
];


export default function DollarAccountPage() {

return (

<main className="min-h-screen bg-background">

<PageHeader
title="Global Accounts"
backHref="/wallet"
/>


<div className="max-w-lg mx-auto px-5 py-6">


<div className="rounded-3xl bg-indigo text-white p-6 mb-7">


<p className="text-xs uppercase tracking-wide text-white/60">
Konek Global Banking
</p>


<h1 className="text-2xl font-bold mt-2">
Receive money from anywhere 🌍
</h1>


<p className="text-sm text-white/70 mt-3">
Create personal USD, GBP or EUR accounts for international payments, salary, freelance work and business.
</p>


</div>





<h2 className="font-heading font-bold text-indigo mb-4">
Choose an account
</h2>




<div className="space-y-4">


{ACCOUNTS.map((account)=>(


<Link

key={account.currency}

href={`/wallet/global-account/${account.currency.toLowerCase()}`}

className="block rounded-3xl bg-white border border-indigo/10 p-5 hover:border-indigo/30 transition"

>


<div className="flex items-start justify-between">


<div className="flex gap-4">


<div className="h-12 w-12 rounded-2xl bg-indigo/10 flex items-center justify-center text-2xl">

{account.flag}

</div>


<div>

<h3 className="font-bold text-indigo">

{account.title}

</h3>


<p className="text-sm text-indigo/60 mt-1">

{account.description}

</p>


</div>


</div>



<div className="font-bold text-indigo text-xl">

{account.symbol}

</div>



</div>



<div className="mt-4 flex justify-between items-center">


<span className="text-xs text-indigo/50">
Personal virtual account
</span>


<span className="text-sm font-semibold text-konek-green">
Create →
</span>


</div>



</Link>


))}



</div>






<div className="mt-7 rounded-3xl bg-konek-green/10 p-5">


<h3 className="font-bold text-indigo">
Who is this for?
</h3>


<ul className="mt-3 space-y-2 text-sm text-indigo/70">


<li>✓ Freelancers receiving international payments</li>

<li>✓ Remote workers</li>

<li>✓ Online business owners</li>

<li>✓ Anyone building global income</li>


</ul>


</div>




</div>


</main>

);

}

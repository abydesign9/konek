interface Props {
  transactions: {
    id:string;
    type:string;
    status:string;
    amount_minor:string;
    currency:string;
    created_at:string;
  }[];
}

export default function TransactionTimeline({transactions}:Props){

return (

<div className="flex flex-col gap-3">

{transactions.map((t)=>(

<div
key={t.id}
className="rounded-2xl bg-white border border-indigo/10 p-4 flex justify-between"
>

<div>

<p className="font-semibold text-indigo capitalize">
{t.type.replace(/_/g," ")}
</p>

<p className="text-xs text-indigo/50">
{new Date(t.created_at).toLocaleDateString()} · {t.status}
</p>

</div>

<p className="font-bold text-indigo">
{t.currency==="USD"?"$":"₦"}
{(Number(t.amount_minor)/100).toLocaleString()}
</p>

</div>

))}

</div>

);

}

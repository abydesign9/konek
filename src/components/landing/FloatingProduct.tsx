"use client";

import Image from "next/image";

export default function FloatingProduct({
  image,
  title,
  text,
}: {
  image:string;
  title:string;
  text:string;
}) {

return (
<div className="relative group">

<div className="absolute -inset-5 rounded-[40px] bg-gradient-to-r from-raviion-green/20 to-gold/20 blur-3xl opacity-70"/>


<div className="relative overflow-hidden rounded-[32px] border border-indigo/10 bg-white shadow-2xl transition duration-700 group-hover:-translate-y-3">


<div className="relative aspect-[16/11]">

<Image
src={image}
alt={title}
fill
className="object-cover"
/>

</div>


<div className="p-6">

<h3 className="font-heading text-xl font-bold text-indigo">
{title}
</h3>

<p className="mt-2 text-sm text-indigo/60">
{text}
</p>

</div>


</div>

</div>
)

}

import FloatingProduct from "./FloatingProduct";


export default function KonekPremiumShowcase(){

return (

<section className="bg-white/60 py-24">


<div className="mx-auto max-w-6xl px-6">


<p className="text-center text-xs uppercase tracking-[0.25em] text-konek-green font-bold">
Everything in one app
</p>


<h2 className="mt-4 text-center font-heading text-4xl font-bold text-indigo">
Your connected world, powered by KONEK
</h2>


<p className="mx-auto mt-4 max-w-2xl text-center text-indigo/60">
eSIM, global accounts, virtual cards, airtime, data and business connectivity in one powerful platform.
</p>



<div className="mt-16 grid gap-10 md:grid-cols-2">


<FloatingProduct

image="/landing/konek_dashboard_day.jpg"

title="One app. Every connection."

text="Manage global accounts, cards, eSIM, airtime and digital services from one beautiful dashboard."

/>



<FloatingProduct

image="/landing/konek_esim_travel.jpg"

title="Travel without borders"

text="Activate eSIM instantly and stay connected anywhere you go."

/>



<FloatingProduct

image="/landing/konek_business_day.jpg"

title="KONEK Business"

text="Receive global payments, manage business connectivity, bulk airtime and team communication."

/>



<FloatingProduct

image="/landing/konek_lifestyle_day.jpg"

title="Built for modern Africans"

text="Pay bills, buy data, access cards and stay connected wherever life takes you."

/>


</div>


</div>


</section>

)

}

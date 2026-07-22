"use client";

import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";


function SettingCard({
  title,
  description,
  href,
  icon,
}:{
  title:string;
  description:string;
  href:string;
  icon:string;
}){

return (

<Link
href={href}
className="flex items-center gap-4 rounded-2xl bg-white border border-indigo/10 p-4"
>


<div className="h-10 w-10 rounded-xl bg-indigo/10 flex items-center justify-center text-xl">

{icon}

</div>


<div>

<p className="font-semibold text-indigo">
{title}
</p>


<p className="text-sm text-indigo/60">
{description}
</p>

</div>


</Link>

);

}



export default function SettingsPage(){


return (

<main className="min-h-screen bg-background pb-28">


<PageHeader
title="Settings"
backHref="/home"
/>



<div className="max-w-lg mx-auto px-5 py-6">



<div className="rounded-3xl bg-indigo text-white p-6 mb-6">


<div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center text-2xl mb-4">

👤

</div>


<h1 className="text-xl font-bold">
Your Account
</h1>


<p className="text-sm text-white/70 mt-1">
Manage your profile, security and preferences.
</p>


</div>





<div className="space-y-3">



<SettingCard

title="Profile"

description="Personal information and account details"

href="/profile/account"

icon="👤"

/>





<SettingCard

title="Verification"

description="View your Konek verification status"

href="/kyc/status"

icon="✅"

/>





<SettingCard

title="PIN Security"

description="Change or manage your transaction PIN"

href="/settings/pin"

icon="🔐"

/>





<SettingCard

title="Sessions & Devices"

description="Manage where you are logged in"

href="/settings/sessions"

icon="📱"

/>





<SettingCard

title="Preferences"

description="Notifications and app settings"

href="/settings/preferences"

icon="⚙️"

/>





<SettingCard

title="Connected Accounts"

description="Manage linked services"

href="/settings/connected-accounts"

icon="🔗"

/>



</div>





<div className="mt-6 rounded-3xl bg-white border border-indigo/10 p-5">


<h2 className="font-bold text-indigo">
Security Protection
</h2>


<p className="text-sm text-indigo/60 mt-2">

Konek protects your account with identity verification,
transaction PINs, fraud monitoring and secure sessions.

</p>


</div>



</div>


</main>

);

}

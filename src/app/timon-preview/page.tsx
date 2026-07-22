"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const STORY = [
  {
    eyebrow: "Global receiving accounts",
    title: "Receive globally. See every currency clearly.",
    body: "Access supported USD, GBP and EUR receiving details for client and business payments from one connected experience.",
    image: "/landing/konek_dashboard_day.jpg",
    bullets: ["USD receiving details", "GBP receiving details", "EUR receiving details"],
  },
  {
    eyebrow: "Travel eSIM",
    title: "Arrive connected, not searching for a SIM.",
    body: "Choose a supported destination, install before departure and activate mobile data when you arrive.",
    image: "/landing/konek_esim_travel.jpg",
    bullets: ["Digital installation", "Local and regional plans", "Usage visibility"],
  },
  {
    eyebrow: "Everything in one app",
    title: "The services that keep your day moving.",
    body: "Buy airtime and data, pay supported bills, manage virtual cards and reach your global accounts in KONEK.",
    image: "/landing/konek_lifestyle_day.jpg",
    bullets: ["Airtime and data", "Bills and subscriptions", "Virtual cards"],
  },
  {
    eyebrow: "KONEK Business",
    title: "Global receiving and connectivity for modern teams.",
    body: "Receive supported international payments and provide airtime, data, eSIMs and virtual cards from one business workspace.",
    image: "/landing/konek_business_day.jpg",
    bullets: ["Global payment receiving", "Bulk airtime and data", "Team and travel eSIMs"],
  },
];

const COUNTRIES = [
  ["🇳🇬", "Nigeria"], ["🇬🇧", "United Kingdom"], ["🇺🇸", "United States"],
  ["🇪🇺", "Europe"], ["🇦🇪", "UAE"], ["🇨🇦", "Canada"],
  ["🇿🇦", "South Africa"], ["🇬🇭", "Ghana"], ["🇰🇪", "Kenya"], ["🇷🇼", "Rwanda"],
];

const USE_CASES = [
  { label: "Freelancers", title: "Receive client payments and pay for the tools you use.", image: "/landing/konek_dollar_account.jpg" },
  { label: "Travelers", title: "Use eSIM connectivity and virtual cards while abroad.", image: "/landing/konek_esim_travel.jpg" },
  { label: "Everyday users", title: "Keep airtime, data, bills and global access together.", image: "/landing/konek_lifestyle_day.jpg" },
  { label: "Businesses", title: "Receive globally and manage team connectivity at scale.", image: "/landing/konek_business_day.jpg" },
];

const FAQS = [
  ["What is KONEK?", "KONEK is a global connectivity platform for eSIMs, global receiving accounts, virtual cards, airtime, data, supported bill payments and business connectivity."],
  ["Is KONEK a bank?", "No. KONEK is a financial technology and connectivity platform. Regulated financial services are provided through licensed infrastructure partners."],
  ["What does KONEK Business provide?", "Global payment receiving, USD/GBP/EUR receiving details, bulk airtime and data, team eSIM connectivity and virtual cards for supported business use cases."],
  ["How do I get started?", "Create an account, complete the required verification and activate the KONEK products available to you."],
];

function Logo() {
  return (
    <Link href="/timon-preview" className="flex items-center gap-2.5 font-heading text-xl font-bold text-indigo">
      <Image src="/brand/logo.png" alt="KONEK" width={36} height={44} priority className="h-10 w-auto object-contain" />
      <span>Konek</span>
    </Link>
  );
}

export default function TimonPreviewPage() {
  const railRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [useCase, setUseCase] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rail = railRef.current;
        if (!rail) return;
        const rect = rail.getBoundingClientRect();
        const distance = Math.max(rail.offsetHeight - window.innerHeight, 1);
        const raw = Math.min(1, Math.max(0, -rect.top / distance));
        setProgress(raw * (STORY.length - 1));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setUseCase((v) => (v + 1) % USE_CASES.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  const activeStory = Math.round(progress);

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfcff] text-indigo">
      <header className="sticky top-0 z-[100] border-b border-indigo/10 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-6 px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-indigo/60 md:flex">
            <a href="#products" className="hover:text-indigo">Products</a>
            <a href="#experience" className="hover:text-indigo">Experience</a>
            <a href="#business" className="hover:text-indigo">Business</a>
            <a href="#setup" className="hover:text-indigo">How it works</a>
          </nav>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/login" className="hidden text-indigo/60 sm:inline">Log in</Link>
            <Link href="/signup" className="rounded-xl bg-indigo px-5 py-3 text-white shadow-lg shadow-indigo/15">Start for free</Link>
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[calc(100vh-72px)] items-center overflow-hidden bg-gradient-to-r from-white to-[#f6f8ff]">
        <div className="absolute -left-40 bottom-[-180px] h-[430px] w-[430px] rounded-full bg-konek-green/15 blur-[90px]" />
        <div className="absolute -right-20 top-10 h-[390px] w-[390px] rounded-full bg-gold/15 blur-[90px]" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-5 py-14 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="relative z-10 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-konek-green/20 bg-white/80 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-konek-green">
              <i className="h-2 w-2 rounded-full bg-konek-green shadow-[0_0_0_5px_rgba(8,123,88,.08)]" />
              Global connectivity platform
            </span>
            <h1 className="mt-6 font-heading text-[clamp(4rem,8vw,8rem)] font-bold uppercase leading-[0.78] tracking-[-0.075em] text-indigo">
              Your world
              <span className="block text-[0.7em] font-medium italic lowercase text-konek-green lg:ml-[18%]">just</span>
              connects.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-indigo/60 lg:mx-0">
              Receive global payments, activate eSIMs, use virtual cards and access airtime, data and supported bills—all from one KONEK app.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/signup" className="inline-flex min-h-13 items-center justify-center gap-5 rounded-xl bg-indigo px-6 py-4 text-sm font-bold text-white shadow-xl shadow-indigo/20">Start for free <span>↗</span></Link>
              <a href="#experience" className="inline-flex min-h-13 items-center justify-center rounded-xl border border-indigo/15 bg-white px-6 py-4 text-sm font-bold">See the experience</a>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-indigo/45 lg:justify-start">
              <span>✓ USD · GBP · EUR receiving</span><span>✓ Travel eSIM</span><span>✓ Virtual cards</span>
            </div>
          </div>

          <div className="relative min-h-[560px] lg:min-h-[650px]">
            <div className="konek-orbit absolute left-1/2 top-1/2 h-[86%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-konek-green/10" />
            <div className="absolute left-1/2 top-1/2 h-[78%] w-[86%] -translate-x-1/2 -translate-y-1/2 rotate-[-2deg] overflow-hidden rounded-[34px] border-[9px] border-white bg-white shadow-[0_45px_100px_rgba(9,17,61,.22)]">
              <Image src="/landing/konek_hero_image.jpg" alt="KONEK global connectivity experience" fill priority sizes="(max-width: 900px) 100vw, 58vw" className="object-cover" />
            </div>
            <div className="konek-float-one absolute left-0 top-[8%] z-10 flex items-center gap-3 rounded-2xl border border-white bg-white/95 p-3.5 shadow-2xl backdrop-blur-xl">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-konek-green/10 text-lg font-black text-konek-green">◎</span>
              <div><small className="block text-[9px] text-indigo/40">Travel eSIM</small><strong className="block text-[11px]">Ready before takeoff</strong><em className="block text-[8px] not-italic text-indigo/40">Digital activation</em></div>
            </div>
            <div className="konek-float-two absolute right-0 top-[7%] z-10 flex items-center gap-3 rounded-2xl border border-white bg-white/95 p-3.5 shadow-2xl backdrop-blur-xl">
              <span className="text-2xl">🇺🇸</span>
              <div><small className="block text-[9px] text-indigo/40">USD receiving account</small><strong className="block text-[11px]">Details active</strong><em className="block text-[8px] not-italic text-indigo/40">Receive supported payments</em></div>
            </div>
            <div className="konek-card-float absolute bottom-[4%] right-0 z-10 w-[210px] rotate-[7deg] rounded-[22px] bg-gradient-to-br from-[#071035] to-[#30349a] p-5 text-white shadow-[0_28px_60px_rgba(6,14,51,.32)]">
              <div className="flex justify-between text-xs"><strong>KONEK</strong><small className="text-white/50">VIRTUAL</small></div>
              <p className="my-9 text-xs font-semibold tracking-[0.15em]">•••• •••• •••• 4246</p>
              <div className="flex justify-between text-[8px]"><small className="text-white/50">TRAVEL & DIGITAL SERVICES</small><strong>VISA</strong></div>
            </div>
            <div className="konek-float-three absolute bottom-[8%] left-[6%] z-10 flex items-center gap-3 rounded-2xl border border-white bg-white/95 p-3.5 shadow-2xl backdrop-blur-xl">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo/10 text-lg font-black text-indigo">▦</span>
              <div><small className="block text-[9px] text-indigo/40">KONEK Business</small><strong className="block text-[11px]">Connectivity at scale</strong><em className="block text-[8px] not-italic text-indigo/40">Airtime · Data · eSIM</em></div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-y border-indigo/10 bg-white">
        <div className="konek-marquee flex w-max gap-3 py-4">
          {[...COUNTRIES, ...COUNTRIES].map(([flag, name], i) => (
            <div key={`${name}-${i}`} className="flex min-w-[155px] items-center gap-2 rounded-xl border border-indigo/10 bg-[#fbfcff] px-4 py-3 text-xs font-bold"><span className="text-xl">{flag}</span>{name}</div>
          ))}
        </div>
      </section>

      <section id="experience" ref={railRef} className="konek-story-rail relative bg-[#071035]" style={{ height: `calc(100vh * ${STORY.length + 0.35})` }}>
        <div className="konek-story-sticky sticky top-0 mx-auto grid h-screen max-w-[1360px] grid-cols-[0.65fr_1.35fr] items-center gap-10 overflow-hidden px-5 text-white">
          <div className="relative z-20 pl-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#76edb8]">One connected experience</span>
            <h2 className="mt-4 font-heading text-[clamp(3rem,4.5vw,5rem)] font-bold leading-[0.95] tracking-[-0.065em]">Scroll through<br />your KONEK world.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/55">Each product works on its own. Together, they remove the friction between getting paid, staying online and accessing essential services.</p>
            <div className="mt-8 grid gap-2">
              {STORY.map((slide, i) => (
                <button key={slide.eyebrow} type="button" className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-xs font-semibold transition ${activeStory === i ? "border-white/15 bg-white/10 text-white" : "border-transparent text-white/35"}`} onClick={() => {
                  const rail = railRef.current; if (!rail) return;
                  const distance = rail.offsetHeight - window.innerHeight;
                  const top = window.scrollY + rail.getBoundingClientRect().top + distance * i / (STORY.length - 1);
                  window.scrollTo({ top, behavior: "smooth" });
                }}><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-[10px]">0{i + 1}</span>{slide.eyebrow}</button>
              ))}
            </div>
          </div>

          <div className="konek-story-viewport relative h-[80vh] max-h-[820px] overflow-hidden rounded-[34px]">
            {STORY.map((slide, i) => {
              const offset = i - progress;
              const distance = Math.abs(offset);
              const opacity = distance > 1.2 ? 0 : Math.max(0.18, 1 - distance * 0.45);
              const scale = 1 - Math.min(distance, 1) * 0.045;
              return (
                <article key={slide.title} className="konek-story-slide absolute inset-0 overflow-hidden rounded-[34px] border border-white/10 bg-[#11194a] shadow-[0_36px_80px_rgba(0,0,0,.32)]" style={{ opacity, transform: `translate3d(0, ${offset * 104}%, 0) scale(${scale})`, zIndex: STORY.length - i }}>
                  <Image src={slide.image} alt={slide.title} fill sizes="(max-width: 900px) 100vw, 65vw" className="object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,10,35,.95),rgba(4,10,35,.62)_43%,rgba(4,10,35,.06)_80%)]" />
                  <div className="absolute bottom-[8%] left-[6%] z-10 w-[46%] max-w-md">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#76edb8]">{slide.eyebrow}</span>
                    <h3 className="mt-3 font-heading text-[clamp(2.2rem,3.5vw,3.8rem)] font-bold leading-[0.98] tracking-[-0.055em]">{slide.title}</h3>
                    <p className="mt-3 text-xs leading-6 text-white/60">{slide.body}</p>
                    <ul className="mt-5 grid gap-2 text-xs text-white/75">{slide.bullets.map((b) => <li key={b} className="flex items-center gap-2"><i className="grid h-5 w-5 place-items-center rounded-full bg-[#76edb8] text-[9px] not-italic font-black text-[#073727]">✓</i>{b}</li>)}</ul>
                    <Link href="/signup" className="mt-6 inline-flex items-center gap-4 rounded-xl bg-[#76edb8] px-4 py-3 text-xs font-bold text-[#073727]">Explore in KONEK <span>↗</span></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="products" className="px-5 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-konek-green">Everything in one app</span>
          <h2 className="mt-4 font-heading text-[clamp(2.8rem,5vw,5.2rem)] font-bold leading-[0.96] tracking-[-0.063em]">The essentials for a connected global life.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-indigo/55">KONEK brings global receiving, mobile connectivity and everyday digital access into one coherent experience.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["◎", "Global eSIM", "Activate supported local, regional and travel data plans digitally."],
            ["$", "Receiving accounts", "Receive supported payments through USD, GBP and EUR account details."],
            ["▰", "Virtual cards", "Create cards for travel, subscriptions, online tools and bills."],
            ["↯", "Airtime, data and bills", "Access everyday connectivity and supported digital services quickly."],
          ].map(([icon, title, body], i) => (
            <article key={title} className="group relative min-h-[310px] overflow-hidden rounded-3xl border border-indigo/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo/10">
              <div className="flex items-center justify-between"><span className="grid h-13 w-13 place-items-center rounded-2xl bg-konek-green/10 text-xl font-black text-konek-green">{icon}</span><small className="font-bold text-indigo/20">0{i + 1}</small></div>
              <h3 className="mt-8 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-indigo/55">{body}</p>
              <a href="#experience" className="absolute bottom-6 left-6 text-xs font-bold">See product ↗</a>
              <div className="absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-konek-green/10 transition duration-500 group-hover:scale-125" />
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mb-24 grid max-w-7xl items-center gap-12 overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_80%_20%,rgba(76,84,218,.62),transparent_35%),linear-gradient(135deg,#071035,#151e65)] px-8 py-16 text-white lg:grid-cols-[0.75fr_1.25fr] lg:px-16">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#76edb8]">Virtual cards</span>
          <h2 className="mt-4 font-heading text-[clamp(2.7rem,4.5vw,4.8rem)] font-bold leading-[0.97] tracking-[-0.06em]">A dedicated card for every digital need.</h2>
          <p className="mt-4 text-sm leading-7 text-white/55">Create virtual cards for supported travel, subscriptions, online tools and essential bills. Keep controls and activity visible inside KONEK.</p>
          <ul className="mt-6 grid gap-3 text-sm text-white/70"><li>✓ Travel and online purchases</li><li>✓ Subscriptions and software tools</li><li>✓ In-app card visibility and controls</li></ul>
          <Link href="/cards" className="mt-7 inline-flex items-center gap-4 rounded-xl bg-[#76edb8] px-5 py-3 text-sm font-bold text-[#073727]">Explore virtual cards ↗</Link>
        </div>
        <div className="relative min-h-[430px]">
          <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo/30 blur-3xl" />
          <div className="konek-big-card absolute left-1/2 top-1/2 z-10 aspect-[1.62] w-[78%] max-w-[470px] -translate-x-1/2 -translate-y-1/2 rotate-[-7deg] rounded-[28px] bg-[radial-gradient(circle_at_80%_10%,rgba(118,237,184,.28),transparent_35%),linear-gradient(135deg,#03091f,#2e3295)] p-8 shadow-[0_40px_85px_rgba(0,0,0,.42)]">
            <div className="flex justify-between"><strong>KONEK</strong><small className="text-white/50">VIRTUAL</small></div><p className="my-[22%] text-lg font-semibold tracking-[0.17em]">•••• •••• •••• 4246</p><div className="flex justify-between text-xs"><small className="text-white/50">DIGITAL SERVICES</small><strong>VISA</strong></div>
          </div>
          <div className="konek-float-one absolute left-[2%] top-[12%] z-20 rounded-xl bg-white px-4 py-3 text-xs font-bold text-indigo shadow-2xl">✈ Travel</div>
          <div className="konek-float-two absolute right-[2%] top-[22%] z-20 rounded-xl bg-white px-4 py-3 text-xs font-bold text-indigo shadow-2xl">▣ Subscriptions</div>
          <div className="konek-float-three absolute bottom-[8%] left-[10%] z-20 rounded-xl bg-white px-4 py-3 text-xs font-bold text-indigo shadow-2xl">⌘ Online tools</div>
        </div>
      </section>

      <section className="overflow-hidden border-y border-indigo/10 bg-white"><div className="konek-service-marquee flex w-max gap-3 py-4">{["Airtime top-up","Mobile data","Travel eSIM","Electricity","Cable TV","Virtual cards","Global receiving","Business connectivity","Airtime top-up","Mobile data","Travel eSIM","Electricity","Cable TV","Virtual cards","Global receiving","Business connectivity"].map((x,i)=><div key={`${x}-${i}`} className="rounded-xl bg-[#f4f6fb] px-5 py-3 text-xs font-bold text-indigo/60"><span className="mr-2 text-konek-green">◎</span>{x}</div>)}</div></section>

      <section id="business" className="grid min-h-[760px] items-center gap-12 bg-[#071035] px-5 py-24 text-white lg:grid-cols-[0.78fr_1.22fr] lg:px-[max(40px,calc((100vw-1240px)/2))]">
        <div className="max-w-xl">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#76edb8]">KONEK Business</span>
          <h2 className="mt-4 font-heading text-[clamp(2.8rem,4.5vw,4.8rem)] font-bold leading-[0.97] tracking-[-0.06em]">Global payment receiving and connectivity for modern teams.</h2>
          <p className="mt-4 text-sm leading-7 text-white/55">Give your business one place to receive supported international payments and provide the connectivity products your people need.</p>
          <div className="mt-7 grid gap-3 text-sm text-white/70">{["USD, GBP and EUR receiving details","Bulk airtime and mobile data","Team and travel eSIMs","Virtual cards for supported business use","Connectivity order visibility","Business connectivity APIs"].map(x=><div key={x} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#76edb8] text-[10px] font-black text-[#073727]">✓</span>{x}</div>)}</div>
          <Link href="/business" className="mt-8 inline-flex items-center gap-4 rounded-xl bg-[#76edb8] px-5 py-3 text-sm font-bold text-[#073727]">Explore KONEK Business ↗</Link>
        </div>
        <div className="relative min-h-[560px] overflow-hidden rounded-[34px] border border-white/10 shadow-[0_40px_85px_rgba(0,0,0,.35)]"><Image src="/landing/konek_business_day.jpg" alt="KONEK Business connectivity" fill sizes="(max-width:900px) 100vw,55vw" className="object-cover" /><div className="absolute bottom-6 left-6 rounded-2xl bg-white/95 p-4 text-indigo shadow-2xl backdrop-blur-xl"><small className="block text-[9px] text-indigo/40">Connectivity order</small><strong className="block text-sm">42 recipients ready</strong><span className="text-[9px] text-indigo/40">Data · Airtime · eSIM</span></div></div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="text-center lg:text-left">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-konek-green">Made for modern global life</span>
          <h2 className="mt-4 font-heading text-[clamp(2.8rem,4.5vw,4.8rem)] font-bold leading-[0.97] tracking-[-0.06em]">Different needs.<br />One connected platform.</h2>
          <div className="mt-7 grid gap-2">{USE_CASES.map((x,i)=><button key={x.label} type="button" onClick={()=>setUseCase(i)} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-xs font-bold ${useCase===i?"border-indigo/10 bg-white shadow-lg shadow-indigo/5":"border-transparent text-indigo/40"}`}><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo/5 text-[10px]">0{i+1}</span>{x.label}</button>)}</div>
        </div>
        <div key={USE_CASES[useCase].image} className="konek-image-enter relative min-h-[560px] overflow-hidden rounded-[34px] shadow-[0_30px_70px_rgba(9,17,61,.13)]"><Image src={USE_CASES[useCase].image} alt={USE_CASES[useCase].title} fill sizes="(max-width:900px) 100vw,55vw" className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#050a23]/80 via-transparent" /><div className="absolute bottom-8 left-8 right-8 z-10 text-white"><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#76edb8]">{USE_CASES[useCase].label}</span><h3 className="mt-3 max-w-2xl font-heading text-[clamp(2.2rem,3.5vw,3.6rem)] font-bold leading-none tracking-[-0.05em]">{USE_CASES[useCase].title}</h3></div></div>
      </section>

      <section id="setup" className="bg-[#f3f5fa] px-5 py-24"><div className="mx-auto max-w-3xl text-center"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-konek-green">Simple setup</span><h2 className="mt-4 font-heading text-[clamp(2.8rem,5vw,5rem)] font-bold leading-[0.97] tracking-[-0.06em]">From sign-up to connected in three steps.</h2></div><div className="mx-auto mt-12 grid max-w-6xl gap-4 md:grid-cols-3">{[["01","Create your KONEK account","Choose personal or business access and set up your profile."],["02","Complete verification","Provide the required information for the products available to you."],["03","Activate what you need","Start with eSIM, receiving accounts, cards, airtime, data or supported bills."]].map(([n,t,b])=><article key={n} className="min-h-[280px] rounded-3xl border border-indigo/10 bg-white p-7"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo text-xs font-black text-white">{n}</span><h3 className="mt-8 text-xl font-bold">{t}</h3><p className="mt-3 text-sm leading-7 text-indigo/55">{b}</p></article>)}</div></section>

      <section className="mx-auto grid max-w-6xl gap-14 px-5 py-24 lg:grid-cols-[0.72fr_1.28fr]"><div><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-konek-green">Questions, answered</span><h2 className="mt-4 font-heading text-[clamp(2.8rem,4.5vw,4.8rem)] font-bold leading-[0.97] tracking-[-0.06em]">Understand KONEK<br />in minutes.</h2><p className="mt-4 text-sm leading-7 text-indigo/55">Clear answers about our global connectivity platform and the products inside it.</p></div><div className="grid gap-3">{FAQS.map(([q,a],i)=><details key={q} open={i===0} className="group overflow-hidden rounded-2xl border border-indigo/10 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between p-5 text-sm font-bold">{q}<span className="text-xl text-konek-green transition group-open:rotate-45">+</span></summary><p className="px-5 pb-5 text-sm leading-7 text-indigo/55">{a}</p></details>)}</div></section>

      <section className="mx-auto mb-20 grid max-w-7xl items-center gap-10 overflow-hidden rounded-[36px] bg-[radial-gradient(circle_at_85%_20%,rgba(118,237,184,.2),transparent_33%),linear-gradient(135deg,#071035,#34379e)] px-8 py-14 text-white lg:grid-cols-[1.25fr_0.75fr] lg:px-14"><div><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#76edb8]">One world. One KONEK.</span><h2 className="mt-4 font-heading text-[clamp(2.8rem,4.5vw,4.8rem)] font-bold leading-[0.97] tracking-[-0.06em]">Your global connectivity stack, in one app.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">Receive globally, stay connected and access the digital services that keep life and business moving.</p></div><div className="grid gap-3"><Link href="/signup" className="rounded-xl bg-[#76edb8] px-6 py-4 text-center text-sm font-bold text-[#073727]">Start for free ↗</Link><a href="#experience" className="rounded-xl border border-white/20 px-6 py-4 text-center text-sm font-bold">See the experience</a></div></section>

      <footer className="bg-[#06102f] px-5 pb-6 pt-16 text-white"><div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]"><div><Logo /><p className="mt-5 max-w-sm text-sm leading-7 text-white/45">Global receiving accounts, eSIM connectivity, virtual cards, business connectivity, airtime, data and supported bills—all in one app.</p></div><div className="grid content-start gap-3 text-sm text-white/50"><strong className="mb-1 text-white">Products</strong><a href="#experience">Global accounts</a><a href="#experience">eSIM</a><a href="#products">Virtual cards</a><a href="#products">Airtime and data</a></div><div className="grid content-start gap-3 text-sm text-white/50"><strong className="mb-1 text-white">Business</strong><a href="#business">Global receiving</a><a href="#business">Bulk connectivity</a><a href="#business">Business eSIM</a><a href="#business">Connectivity APIs</a></div><div className="grid content-start gap-3 text-sm text-white/50"><strong className="mb-1 text-white">Company</strong><a href="#">About</a><a href="mailto:support@konek.app">Contact</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></div><div className="mx-auto mt-12 grid max-w-7xl gap-3 border-t border-white/10 pt-5 text-xs leading-6 text-white/35 md:grid-cols-[0.35fr_0.65fr]"><span>© {new Date().getFullYear()} KONEK. All rights reserved.</span><p>KONEK is a financial technology and global connectivity platform, not a bank. Regulated financial services are provided through licensed infrastructure partners.</p></div></footer>

      <style jsx global>{`
        @keyframes konekFloatOne { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes konekFloatTwo { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-5px,11px)} }
        @keyframes konekFloatThree { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
        @keyframes konekCardFloat { 0%,100%{transform:rotate(7deg) translateY(0)} 50%{transform:rotate(4deg) translateY(-13px)} }
        @keyframes konekBigCard { 0%,100%{transform:translate(-50%,-50%) rotate(-7deg)} 50%{transform:translate(-50%,calc(-50% - 14px)) rotate(-3deg)} }
        @keyframes konekRotate { to{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes konekMarquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes konekMarqueeReverse { from{transform:translateX(-50%)} to{transform:translateX(0)} }
        @keyframes konekImageEnter { from{opacity:0;transform:translateY(24px) scale(.985)} to{opacity:1;transform:none} }
        .konek-float-one{animation:konekFloatOne 5.8s ease-in-out infinite}.konek-float-two{animation:konekFloatTwo 6.4s ease-in-out infinite}.konek-float-three{animation:konekFloatThree 6.7s ease-in-out infinite}.konek-card-float{animation:konekCardFloat 6.2s ease-in-out infinite}.konek-big-card{animation:konekBigCard 7s ease-in-out infinite}.konek-orbit{animation:konekRotate 25s linear infinite}.konek-marquee{animation:konekMarquee 30s linear infinite}.konek-service-marquee{animation:konekMarqueeReverse 32s linear infinite}.konek-image-enter{animation:konekImageEnter .6s ease both}.konek-story-slide{will-change:transform,opacity;transition:opacity .12s linear}
        @media (max-width:900px){.konek-story-rail{height:auto!important;padding:80px 0}.konek-story-sticky{position:static!important;height:auto!important;display:block!important;overflow:visible!important}.konek-story-sticky>div:first-child{margin:0 auto 35px;max-width:640px;text-align:center}.konek-story-sticky>div:first-child>div{display:none}.konek-story-viewport{height:auto!important;max-height:none!important;display:grid;gap:22px;overflow:visible!important}.konek-story-slide{position:relative!important;inset:auto!important;min-height:620px;opacity:1!important;transform:none!important}.konek-story-slide>div:last-child{width:82%!important}.konek-story-slide>div:nth-child(2){background:linear-gradient(0deg,rgba(4,10,35,.94),rgba(4,10,35,.22) 78%,rgba(4,10,35,.06))!important}}
        @media (prefers-reduced-motion:reduce){.konek-float-one,.konek-float-two,.konek-float-three,.konek-card-float,.konek-big-card,.konek-orbit,.konek-marquee,.konek-service-marquee,.konek-image-enter{animation:none}.konek-story-slide{transition:none}}
      `}</style>
    </main>
  );
}

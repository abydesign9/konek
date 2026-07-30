"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";

import styles from "./TimonPreview.module.css";

type StoryCard = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  accent: string;
  soft: string;
  bullets: string[];
  statusTitle: string;
  statusText: string;
};

const STORY_CARDS: StoryCard[] = [
  {
    number: "01",
    eyebrow: "Everything in one app",
    title: "Your connected world, all in one place.",
    description:
      "Access global receiving accounts, eSIM connectivity, virtual cards, airtime, data and essential digital services through one KONEK experience.",
    image: "/landing/konek-stack-everything.jpg",
    imageAlt:
      "KONEK global connectivity services presented on mobile devices",
    accent: "#006747",
    soft: "#E4F1EC",
    bullets: [
      "USD, GBP and EUR receiving accounts",
      "Airtime, mobile data and bills",
      "Virtual cards and global eSIMs",
    ],
    statusTitle: "Everything connected",
    statusText: "One account. One KONEK experience.",
  },
  {
    number: "02",
    eyebrow: "Global eSIM",
    title: "Stay connected wherever your journey takes you.",
    description:
      "Choose a destination, select a data plan and activate your eSIM digitally without replacing your physical SIM card.",
    image: "/landing/konek-stack-esim.jpg",
    imageAlt:
      "A traveller using KONEK global eSIM connectivity",
    accent: "#006747",
    soft: "#E4F1EC",
    bullets: [
      "Instant digital activation",
      "Local, regional and global plans",
      "Simple in-app data management",
    ],
    statusTitle: "eSIM activated",
    statusText: "Your travel data is ready.",
  },
  {
    number: "03",
    eyebrow: "Everyday connectivity",
    title: "Keep every part of your day connected.",
    description:
      "Purchase airtime and mobile data, pay essential bills and access the services that keep your connected life moving.",
    image: "/landing/konek-stack-lifestyle.jpg",
    imageAlt:
      "A professional using KONEK for everyday digital services",
    accent: "#D4A33A",
    soft: "#F6E8C5",
    bullets: [
      "Airtime and mobile data",
      "Electricity and supported bills",
      "Virtual cards for digital services",
    ],
    statusTitle: "Service completed",
    statusText: "Fast, simple and securely connected.",
  },
  {
    number: "04",
    eyebrow: "KONEK Business",
    title: "Global payments and connectivity for modern teams.",
    description:
      "Receive supported global payments and provide airtime, data, eSIMs and virtual cards through one connected business workspace.",
    image: "/landing/konek-stack-business.jpg",
    imageAlt:
      "KONEK Business global payments and connectivity dashboard",
    accent: "#D4A33A",
    soft: "#F6E8C5",
    bullets: [
      "Receive supported global payments",
      "Bulk airtime, mobile data and eSIMs",
      "Virtual cards for business connectivity",
    ],
    statusTitle: "Business connected",
    statusText: "Global access for modern teams.",
  },
];


const COVERAGE_COUNTRIES = [
  {
    name: "Nigeria",
    flag: "🇳🇬",
    region: "Africa",
  },
  {
    name: "Ghana",
    flag: "🇬🇭",
    region: "Africa",
  },
  {
    name: "Kenya",
    flag: "🇰🇪",
    region: "Africa",
  },
  {
    name: "South Africa",
    flag: "🇿🇦",
    region: "Africa",
  },
  {
    name: "Egypt",
    flag: "🇪🇬",
    region: "Africa",
  },
  {
    name: "United States",
    flag: "🇺🇸",
    region: "Americas",
  },
  {
    name: "Canada",
    flag: "🇨🇦",
    region: "Americas",
  },
  {
    name: "Brazil",
    flag: "🇧🇷",
    region: "Americas",
  },
  {
    name: "United Kingdom",
    flag: "🇬🇧",
    region: "Europe",
  },
  {
    name: "Germany",
    flag: "🇩🇪",
    region: "Europe",
  },
  {
    name: "France",
    flag: "🇫🇷",
    region: "Europe",
  },
  {
    name: "Spain",
    flag: "🇪🇸",
    region: "Europe",
  },
  {
    name: "United Arab Emirates",
    flag: "🇦🇪",
    region: "Middle East",
  },
  {
    name: "Saudi Arabia",
    flag: "🇸🇦",
    region: "Middle East",
  },
  {
    name: "India",
    flag: "🇮🇳",
    region: "Asia",
  },
  {
    name: "Singapore",
    flag: "🇸🇬",
    region: "Asia",
  },
  {
    name: "Japan",
    flag: "🇯🇵",
    region: "Asia",
  },
  {
    name: "Australia",
    flag: "🇦🇺",
    region: "Oceania",
  },
];

const BUSINESS_CAPABILITIES = [
  {
    number: "01",
    icon: "◎",
    title: "Global receiving accounts",
    description:
      "Access supported USD, GBP and EUR account details for receiving global payments.",
    tag: "Global accounts",
  },
  {
    number: "02",
    icon: "↗",
    title: "Global payment receiving",
    description:
      "Receive supported payments from clients, platforms and international business partners.",
    tag: "Business payments",
  },
  {
    number: "03",
    icon: "✈",
    title: "Global eSIM connectivity",
    description:
      "Activate local, regional and international data plans directly from the KONEK app.",
    tag: "Travel connectivity",
  },
  {
    number: "04",
    icon: "▰",
    title: "Virtual cards",
    description:
      "Create virtual cards for travel, subscriptions, software and supported online services.",
    tag: "Digital cards",
  },
  {
    number: "05",
    icon: "↯",
    title: "Airtime and mobile data",
    description:
      "Purchase airtime and data for yourself, your customers, your family or your team.",
    tag: "Everyday connectivity",
  },
  {
    number: "06",
    icon: "▦",
    title: "Essential bill payments",
    description:
      "Pay supported electricity, cable and other essential digital services from one place.",
    tag: "Bill services",
  },
  {
    number: "07",
    icon: "◉",
    title: "Bulk team connectivity",
    description:
      "Provide airtime, data and eSIM connectivity to teams through KONEK Business.",
    tag: "KONEK Business",
  },
  {
    number: "08",
    icon: "◇",
    title: "Connected business workspace",
    description:
      "View global accounts, business connectivity and virtual cards through one clear dashboard.",
    tag: "Business workspace",
  },
];

export default function TimonPreviewPage() {
  const [activeCard, setActiveCard] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-konek-story]",
      ),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              second.intersectionRatio -
              first.intersectionRatio,
          );

        const current = visibleEntries[0];

        if (!current) {
          return;
        }

        const index = Number(
          current.target.getAttribute("data-konek-story"),
        );

        if (!Number.isNaN(index)) {
          setActiveCard(index);
        }
      },
      {
        threshold: [0.35, 0.5, 0.65, 0.8],
        rootMargin: "-15% 0px -30% 0px",
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const scrollToStory = (index: number) => {
    const element = document.querySelector<HTMLElement>(
      `[data-konek-story="${index}"]`,
    );

    element?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className={styles.page}>
      <nav className={styles.navigation}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logoWrap}>
            <Image
              src="/brand/konek-logo.svg"
              unoptimized
              alt="KONEK logo"
              fill
              sizes="42px"
              className={styles.logoImage}
            />
          </span>

          <strong>KONEK</strong>
        </Link>

        <div className={styles.desktopLinks}>
          <Link href="/personal">Personal</Link>
          <Link href="/business-solutions">Business</Link>
          <Link href="/connectivity">Connectivity</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/help">Support</Link>
          <Link href="/about">Company</Link>
        </div>

        <div className={styles.navActions}>
          <Link href="/login" className={styles.login}>
            Log in
          </Link>

          <Link href="/signup" className={styles.getStarted}>
            Get started
          </Link>

          <button
            type="button"
            className={styles.menuButton}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span />
            <span />
          </button>
        </div>

        {menuOpen ? (
          <div className={styles.mobileMenu}>
            <Link href="/personal" onClick={() => setMenuOpen(false)}>Personal</Link>
            <Link href="/business-solutions" onClick={() => setMenuOpen(false)}>Business</Link>
            <Link href="/connectivity" onClick={() => setMenuOpen(false)}>Connectivity</Link>
            <Link href="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link href="/help" onClick={() => setMenuOpen(false)}>Support</Link>
            <Link href="/about" onClick={() => setMenuOpen(false)}>Company</Link>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Create account</Link>
          </div>
        ) : null}
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroGlowOne} />
        <div className={styles.heroGlowTwo} />

        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>
            GLOBAL PAYMENTS AND CONNECTIVITY
          </p>

          <h1>
            One app for your
            <span> connected world.</span>
          </h1>

          <p className={styles.heroDescription}>
            Receive global payments, stay connected with eSIMs,
            manage virtual cards and access the services that keep
            life and business moving.
          </p>

          <div className={styles.heroActions}>
            <Link href="/signup" className={styles.primaryButton}>
              Create your account
              <span>→</span>
            </Link>

            <a
              href="#experience"
              className={styles.secondaryButton}
            >
              Explore KONEK
            </a>
          </div>

          <div className={styles.heroTrust}>
            <div>
              <strong>USD · GBP · EUR</strong>
              <span>Global receiving accounts</span>
            </div>

            <div>
              <strong>190+ destinations</strong>
              <span>Travel eSIM connectivity</span>
            </div>

            <div>
              <strong>One connected app</strong>
              <span>Personal and business access</span>
            </div>
          </div>
        </div>

        <div className={styles.heroOrbit} aria-hidden="true">
          <div className={styles.orbitCircleOne} />
          <div className={styles.orbitCircleTwo} />

          <div className={styles.heroPhone}>
            <div className={styles.phoneTop}>
              <span>9:41</span>
              <i />
            </div>

            <div className={styles.phoneBrand}>
              <span className={styles.phoneLogo}>
                <Image
                  src="/brand/konek-logo.svg"
                  unoptimized
                  alt=""
                  fill
                  sizes="30px"
                  className={styles.phoneLogoImage}
                />
              </span>

              <strong>KONEK</strong>
              <button type="button" aria-label="Notifications">
                •
              </button>
            </div>

            <p>Good morning</p>
            <h2>Your connected world</h2>

            <div className={styles.phoneBalance}>
              <span>Available balance</span>
              <strong>₦485,240.00</strong>

              <div>
                <button type="button">Add funds</button>
                <button type="button">Accounts</button>
              </div>
            </div>

            <div className={styles.phoneServices}>
              <span>eSIM</span>
              <span>Cards</span>
              <span>Airtime</span>
              <span>Data</span>
            </div>

            <div className={styles.phoneActivity}>
              <div>
                <strong>Recent activity</strong>
                <span>View all</span>
              </div>

              <p>
                <i>✓</i>
                Mobile data
                <strong>₦5,000</strong>
              </p>

              <p>
                <i>$</i>
                USD account
                <strong>Active</strong>
              </p>
            </div>
          </div>

          <div className={styles.heroFloatingCardOne}>
            <span>✓</span>

            <div>
              <small>GLOBAL ACCOUNT</small>
              <strong>USD account ready</strong>
            </div>
          </div>

          <div className={styles.heroFloatingCardTwo}>
            <span>eSIM</span>

            <div>
              <small>CONNECTED</small>
              <strong>Travel data active</strong>
            </div>
          </div>

          <div className={styles.heroVirtualCard}>
            <small>KONEK VIRTUAL</small>
            <strong>•••• 4827</strong>
            <span>VISA</span>
          </div>
        </div>

        <a href="#experience" className={styles.heroScroll}>
          <span />
          Scroll to explore
        </a>
      </section>

      <section
        id="experience"
        className={styles.experienceIntroduction}
      >
        <p>ONE CONNECTED EXPERIENCE</p>

        <h2>
          Everything moves with
          <span> your world.</span>
        </h2>

        <div>
          Keep scrolling. Each KONEK experience will rise from the
          bottom and cover the previous one.
        </div>
      </section>

      <section className={styles.storyStack}>
        {STORY_CARDS.map((card, index) => {
          const desktopTop = 76 + index * 6;
          const mobileTop = 62 + index * 3;

          const variables = {
            "--desktop-top": `${desktopTop}px`,
            "--desktop-height": `calc(100svh - ${
              desktopTop + 12
            }px)`,
            "--mobile-top": `${mobileTop}px`,
            "--mobile-height": `calc(100svh - ${
              mobileTop + 8
            }px)`,
            "--layer": index + 10,
            "--accent": card.accent,
            "--soft": card.soft,
          } as CSSProperties;

          return (
            <article
              key={card.number}
              data-konek-story={index}
              className={styles.storyPanel}
              style={variables}
            >
              <div className={styles.storyCard}>
                <div className={styles.storyVisual}>
                  <Image
                    src={card.image}
                    alt={card.imageAlt}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 860px) 100vw, 56vw"
                    className={styles.storyImage}
                  />

                  <div className={styles.storyImageShade} />

                  <span className={styles.storyNumber}>
                    {card.number}
                  </span>

                  <div className={styles.storyStatus}>
                    <span className={styles.storyStatusIcon}>
                      {index === 0
                        ? "◎"
                        : index === 1
                          ? "✈"
                          : index === 2
                            ? "↯"
                            : "▦"}
                    </span>

                    <div>
                      <small>KONEK</small>
                      <strong>{card.statusTitle}</strong>
                      <p>{card.statusText}</p>
                    </div>

                    <i />
                  </div>
                </div>

                <div className={styles.storyCopy}>
                  <div className={styles.storyHeading}>
                    <span>{card.number}</span>
                    <p>{card.eyebrow}</p>
                  </div>

                  <h3>{card.title}</h3>

                  <p className={styles.storyDescription}>
                    {card.description}
                  </p>

                  <ul>
                    {card.bullets.map((bullet) => (
                      <li key={bullet}>
                        <span>✓</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className={styles.storyAction}
                  >
                    Explore this service
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <aside className={styles.storyProgress}>
        {STORY_CARDS.map((card, index) => (
          <button
            type="button"
            key={card.number}
            className={
              activeCard === index
                ? styles.activeProgress
                : undefined
            }
            aria-label={`View ${card.eyebrow}`}
            onClick={() => scrollToStory(index)}
          >
            <span />
          </button>
        ))}
      </aside>


      <section
        id="coverage"
        className={styles.coverageSection}
      >
        <div className={styles.coverageGlowOne} />
        <div className={styles.coverageGlowTwo} />

        <div className={styles.coverageHeading}>
          <div>
            <p>GLOBAL COVERAGE</p>

            <h2>
              Your world is bigger with
              <span> KONEK.</span>
            </h2>
          </div>

          <div className={styles.coverageSummary}>
            <strong>190+</strong>

            <span>
              eSIM destinations across Africa, Europe, Asia,
              the Americas, the Middle East and Oceania.
            </span>
          </div>
        </div>

        <div className={styles.coverageBody}>
          <div className={styles.worldVisual}>
            <div className={styles.worldCircle}>
              <div className={styles.worldGrid} />

              <span className={styles.worldPinOne} />
              <span className={styles.worldPinTwo} />
              <span className={styles.worldPinThree} />
              <span className={styles.worldPinFour} />
              <span className={styles.worldPinFive} />

              <div className={styles.worldCenter}>
                <span className={styles.logoWrap}>
                  <Image
                    src="/brand/konek-logo.svg"
                    unoptimized
                    alt=""
                    fill
                    sizes="56px"
                    className={styles.logoImage}
                  />
                </span>

                <strong>KONEK</strong>
                <small>Globally connected</small>
              </div>
            </div>

            <div className={styles.coverageFloatingOne}>
              <span>✓</span>

              <div>
                <small>CONNECTED</small>
                <strong>Global eSIM active</strong>
              </div>
            </div>

            <div className={styles.coverageFloatingTwo}>
              <span>◎</span>

              <div>
                <small>GLOBAL ACCESS</small>
                <strong>USD · GBP · EUR</strong>
              </div>
            </div>
          </div>

          <div className={styles.countryPanel}>
            <div className={styles.countryPanelHeading}>
              <div>
                <p>Featured destinations</p>
                <span>
                  Explore local and regional connectivity.
                </span>
              </div>

              <Link href="/signup">
                View in app
                <span>→</span>
              </Link>
            </div>

            <div className={styles.countryMarquee}>
              <div className={styles.countryTrack}>
                {[...COVERAGE_COUNTRIES, ...COVERAGE_COUNTRIES].map((country, i) => (
                  <article key={`${country.name}-${i}`}>
                    <span className={styles.countryFlag}>
                      {country.flag}
                    </span>

                    <div>
                      <strong>{country.name}</strong>
                      <small>{country.region}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.regionTicker}>
          <span>Africa</span>
          <i />
          <span>Europe</span>
          <i />
          <span>Asia</span>
          <i />
          <span>Middle East</span>
          <i />
          <span>North America</span>
          <i />
          <span>South America</span>
          <i />
          <span>Oceania</span>
        </div>
      </section>

      <section className={styles.ecosystemSection}>
        <div className={styles.ecosystemHeading}>
          <div>
            <p>THE KONEK ECOSYSTEM</p>

            <h2>
              Everything your connected life and
              <span> business need.</span>
            </h2>
          </div>

          <div>
            KONEK brings global payment receiving, digital
            connectivity and essential services into one modern
            platform.
          </div>
        </div>

        <div className={styles.capabilityGrid}>
          {BUSINESS_CAPABILITIES.map((capability) => (
            <article key={capability.number}>
              <div className={styles.capabilityTop}>
                <span className={styles.capabilityIcon}>
                  {capability.icon}
                </span>

                <small>{capability.number}</small>
              </div>

              <p>{capability.tag}</p>

              <h3>{capability.title}</h3>

              <div>{capability.description}</div>

              <Link href="/signup">
                Explore
                <span>→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.businessExperience}>
        <div className={styles.businessExperienceCopy}>
          <p>KONEK BUSINESS</p>

          <h2>
            Built for businesses that operate beyond borders.
          </h2>

          <div>
            Give your business one connected workspace for
            supported global payment receiving, team airtime,
            mobile data, eSIMs and virtual cards.
          </div>

          <ul>
            <li>
              <span>✓</span>
              Receive supported global payments
            </li>

            <li>
              <span>✓</span>
              Access USD, GBP and EUR account details
            </li>

            <li>
              <span>✓</span>
              Provide bulk airtime, data and eSIMs
            </li>

            <li>
              <span>✓</span>
              Create virtual cards for supported business services
            </li>
          </ul>

          <Link href="/signup">
            Explore KONEK Business
            <span>→</span>
          </Link>
        </div>

        <div className={styles.businessDashboard}>
          <div className={styles.dashboardTop}>
            <div>
              <span className={styles.logoWrap}>
                <Image
                  src="/brand/konek-logo.svg"
                  unoptimized
                  alt=""
                  fill
                  sizes="40px"
                  className={styles.logoImage}
                />
              </span>

              <div>
                <strong>KONEK Business</strong>
                <small>Connected workspace</small>
              </div>
            </div>

            <span>Active</span>
          </div>

          <div className={styles.dashboardBalance}>
            <span>Business wallet</span>
            <strong>$132,540.00</strong>

            <div>
              <small>USD</small>
              <small>GBP</small>
              <small>EUR</small>
            </div>
          </div>

          <div className={styles.dashboardAccounts}>
            <article>
              <span>🇺🇸</span>

              <div>
                <small>USD account</small>
                <strong>$68,250.00</strong>
              </div>
            </article>

            <article>
              <span>🇬🇧</span>

              <div>
                <small>GBP account</small>
                <strong>£24,430.00</strong>
              </div>
            </article>

            <article>
              <span>🇪🇺</span>

              <div>
                <small>EUR account</small>
                <strong>€39,860.00</strong>
              </div>
            </article>
          </div>

          <div className={styles.dashboardServices}>
            <article>
              <span>↯</span>
              <strong>Bulk airtime and data</strong>
              <small>Team connectivity</small>
            </article>

            <article>
              <span>✈</span>
              <strong>Business eSIM</strong>
              <small>Global access</small>
            </article>

            <article>
              <span>▰</span>
              <strong>Virtual cards</strong>
              <small>Digital services</small>
            </article>

            <article>
              <span>◎</span>
              <strong>Global receiving</strong>
              <small>Supported payments</small>
            </article>
          </div>

          <div className={styles.dashboardActivity}>
            <div>
              <strong>Recent activity</strong>
              <span>View all</span>
            </div>

            <p>
              <i>✓</i>
              Global payment received
              <strong>+$4,250.00</strong>
            </p>

            <p>
              <i>↯</i>
              Team mobile data
              <strong>Completed</strong>
            </p>
          </div>
        </div>
      </section>

      <section className={styles.trustSection}>
        <div className={styles.trustHeading}>
          <p>SECURE BY DESIGN</p>

          <h2>
            Built to protect every
            <span> connection.</span>
          </h2>
        </div>

        <div className={styles.trustGrid}>
          <article>
            <span>◇</span>
            <strong>Protected access</strong>
            <p>
              Secure account controls designed to protect your
              KONEK experience.
            </p>
          </article>

          <article>
            <span>✓</span>
            <strong>Clear verification</strong>
            <p>
              Structured identity and business verification for
              supported KONEK services.
            </p>
          </article>

          <article>
            <span>◎</span>
            <strong>Service visibility</strong>
            <p>
              View balances, connectivity and supported services
              from one clear dashboard.
            </p>
          </article>

          <article>
            <span>◉</span>
            <strong>Customer support</strong>
            <p>
              Get help with your account, eSIM connectivity and
              supported KONEK services.
            </p>
          </article>
        </div>
      </section>

      <section
        id="connectivity"
        className={styles.connectedSection}
      >
        <div className={styles.connectedCopy}>
          <p>BUILT FOR A CONNECTED GENERATION</p>

          <h2>
            Move globally.
            <span> Stay connected.</span>
          </h2>

          <div>
            KONEK combines global payment receiving and digital
            connectivity in one clear, modern experience.
          </div>
        </div>

        <div className={styles.connectedStats}>
          <article>
            <strong>3</strong>
            <span>Global receiving currencies</span>
          </article>

          <article>
            <strong>190+</strong>
            <span>eSIM destinations</span>
          </article>

          <article>
            <strong>24/7</strong>
            <span>Access to digital services</span>
          </article>
        </div>
      </section>

      <section id="business" className={styles.businessCta}>
        <div>
          <p>KONEK BUSINESS</p>

          <h2>
            Connect your business to a global future.
          </h2>

          <span>
            Receive supported global payments and provide the
            connectivity services your team needs.
          </span>
        </div>

        <Link href="/signup">
          Open a business account
          <span>→</span>
        </Link>
      </section>
<footer id="about" className={styles.richFooter}>
        <div className={styles.footerMain}>
          <div className={styles.footerIdentity}>
            <Link href="/" className={styles.footerLogo}>
              <span className={styles.footerLogoImage}>
                <Image
                  src="/brand/konek-logo.svg"
                  unoptimized
                  alt="KONEK logo"
                  fill
                  sizes="58px"
                  className={styles.logoImage}
                />
              </span>

              <div>
                <strong>KONEK</strong>
                <small>Global connectivity, simplified.</small>
              </div>
            </Link>

            <p>
              Global payment receiving and digital connectivity
              for individuals, travellers, professionals and
              modern businesses. Konek is a product of Topton
              Global Consult.
            </p>

            <div className={styles.footerAppButtons}>
              <a href="#" aria-label="Download KONEK on App Store">
                <span>●</span>

                <div>
                  <small>Download on the</small>
                  <strong>App Store</strong>
                </div>
              </a>

              <a href="#" aria-label="Get KONEK on Google Play">
                <span>▶</span>

                <div>
                  <small>Get it on</small>
                  <strong>Google Play</strong>
                </div>
              </a>
            </div>

            <div className={styles.footerSocials}>
              <a href="#" aria-label="KONEK on Instagram">
                IG
              </a>

              <a href="#" aria-label="KONEK on X">
                X
              </a>

              <a href="#" aria-label="KONEK on LinkedIn">
                IN
              </a>

              <a href="#" aria-label="KONEK on Facebook">
                FB
              </a>
            </div>
          </div>

          <div className={styles.footerLinks}>
            <div>
              <strong>Personal</strong>
              <a href="#experience">Everything in one app</a>
              <a href="#coverage">Global eSIM</a>
              <a href="#experience">Virtual cards</a>
              <a href="#experience">Airtime and data</a>
              <a href="#experience">Bill payments</a>
            </div>

            <div>
              <strong>Global accounts</strong>
              <a href="#experience">USD account</a>
              <a href="#experience">GBP account</a>
              <a href="#experience">EUR account</a>
              <a href="#experience">Payment receiving</a>
              <a href="#coverage">Country coverage</a>
            </div>

            <div>
              <strong>Business</strong>
              <a href="#business">KONEK Business</a>
              <a href="#business">Bulk airtime</a>
              <a href="#business">Bulk mobile data</a>
              <a href="#business">Business eSIM</a>
              <a href="#business">Virtual cards</a>
            </div>

            <div>
              <strong>Company</strong>
              <a href="#about">About KONEK</a>
              <a href="#">Careers</a>
              <a href="#">Partners</a>
              <a href="#">Newsroom</a>
              <a href="#">Contact</a>
            </div>

            <div>
              <strong>Support</strong>
              <a href="#">Help centre</a>
              <a href="#">eSIM support</a>
              <a href="#">Account support</a>
              <a href="#">Business support</a>
              <a href="#">Service status</a>
            </div>
          </div>
        </div>

        <div className={styles.footerCoverage}>
          <div>
            <span>🇳🇬</span>
            Nigeria
          </div>

          <div>
            <span>🇬🇭</span>
            Ghana
          </div>

          <div>
            <span>🇰🇪</span>
            Kenya
          </div>

          <div>
            <span>🇿🇦</span>
            South Africa
          </div>

          <div>
            <span>🇬🇧</span>
            United Kingdom
          </div>

          <div>
            <span>🇺🇸</span>
            United States
          </div>

          <div>
            <span>🇦🇪</span>
            UAE
          </div>

          <div>
            <span>🇸🇬</span>
            Singapore
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>
            © 2026 KONEK. Global connectivity for people and
            businesses. Konek is a product of Topton Global Consult.
          </p>

          <div>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
            <a href="#">Acceptable use</a>
          </div>

          <span>
            Made for a connected world
            <i />
          </span>
        </div>
      </footer>
    </main>
  );
}

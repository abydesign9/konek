import Image from "next/image";
import styles from "./HeroFloatingUI.module.css";

export default function HeroFloatingUI() {
  return (
    <div className={styles.stage}>
      <div aria-hidden="true" className={styles.greenGlow} />
      <div aria-hidden="true" className={styles.goldGlow} />

      <div className={styles.imageFrame}>
        <Image
          src="/landing/raviion_hero_image.jpg"
          alt="raviion global connectivity platform showing eSIM, global receiving accounts, virtual cards, airtime, data and business connectivity"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className={styles.heroImage}
        />

        <div aria-hidden="true" className={styles.imageOverlay} />
      </div>

      <div className={`${styles.floatingPanel} ${styles.esimPanel}`}>
        <span className={styles.greenIcon}>◎</span>

        <div>
          <small>Travel eSIM</small>
          <strong>Connected instantly</strong>
          <p>10 GB · 30 days</p>
        </div>

        <span className={styles.statusDot} />
      </div>

      <div className={`${styles.floatingPanel} ${styles.usdPanel}`}>
        <span className={styles.flag}>🇺🇸</span>

        <div>
          <small>USD receiving account</small>
          <strong>Ready to receive</strong>
          <p>Account details active</p>
        </div>
      </div>

      <div className={`${styles.currencyPanel} ${styles.currencyPosition}`}>
        <div>
          <span>🇺🇸</span>

          <p>
            <small>USD</small>
            <strong>$6,250.40</strong>
          </p>
        </div>

        <div>
          <span>🇬🇧</span>

          <p>
            <small>GBP</small>
            <strong>£1,860.30</strong>
          </p>
        </div>

        <div>
          <span>🇪🇺</span>

          <p>
            <small>EUR</small>
            <strong>€2,340.65</strong>
          </p>
        </div>
      </div>

      <div className={styles.virtualCard}>
        <div className={styles.cardTop}>
          <strong>raviion</strong>
          <span>VIRTUAL</span>
        </div>

        <p>•••• •••• •••• 4246</p>

        <div className={styles.cardBottom}>
          <small>TRAVEL &amp; SUBSCRIPTIONS</small>
          <strong>GLOBAL</strong>
        </div>
      </div>

      <div className={`${styles.floatingPanel} ${styles.businessPanel}`}>
        <span className={styles.businessIcon}>▦</span>

        <div>
          <small>raviion Business</small>
          <strong>Connectivity at scale</strong>
          <p>Bulk airtime · Data · eSIM</p>
        </div>
      </div>
    </div>
  );
}

// Country + carrier reference for international top-up, with dial-code based
// carrier detection (the same "type a number, we detect the country" UX a
// real Reloadly integration gives you). This is a representative diaspora-
// focused subset; a live vendor feed would replace the static list without
// the UI changing.

export interface Carrier {
  id: string;
  name: string;
}

export interface Country {
  code: string; // ISO-ish id used in our recipient network field
  name: string;
  dialCode: string; // E.164 country calling code, incl. leading +
  flag: string; // emoji
  carriers: Carrier[];
}

export const COUNTRIES: Country[] = [
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬", carriers: [
    { id: "mtn", name: "MTN" }, { id: "airtel", name: "Airtel" }, { id: "glo", name: "Glo" }, { id: "9mobile", name: "9mobile" },
  ] },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭", carriers: [
    { id: "mtn", name: "MTN" }, { id: "telecel", name: "Telecel" }, { id: "airteltigo", name: "AirtelTigo" },
  ] },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪", carriers: [
    { id: "safaricom", name: "Safaricom" }, { id: "airtel", name: "Airtel" }, { id: "telkom", name: "Telkom" },
  ] },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦", carriers: [
    { id: "vodacom", name: "Vodacom" }, { id: "mtn", name: "MTN" }, { id: "cellc", name: "Cell C" }, { id: "telkom", name: "Telkom" },
  ] },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸", carriers: [
    { id: "att", name: "AT&T" }, { id: "tmobile", name: "T-Mobile" }, { id: "verizon", name: "Verizon" },
  ] },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦", carriers: [
    { id: "rogers", name: "Rogers" }, { id: "bell", name: "Bell" }, { id: "telus", name: "Telus" },
  ] },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧", carriers: [
    { id: "ee", name: "EE" }, { id: "o2", name: "O2" }, { id: "vodafone", name: "Vodafone" }, { id: "three", name: "Three" },
  ] },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳", carriers: [
    { id: "jio", name: "Jio" }, { id: "airtel", name: "Airtel" }, { id: "vi", name: "Vi" },
  ] },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪", carriers: [
    { id: "etisalat", name: "Etisalat" }, { id: "du", name: "du" },
  ] },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦", carriers: [
    { id: "stc", name: "STC" }, { id: "mobily", name: "Mobily" }, { id: "zain", name: "Zain" },
  ] },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬", carriers: [
    { id: "vodafone", name: "Vodafone" }, { id: "orange", name: "Orange" }, { id: "etisalat", name: "Etisalat" },
  ] },
  { code: "CM", name: "Cameroon", dialCode: "+237", flag: "🇨🇲", carriers: [
    { id: "mtn", name: "MTN" }, { id: "orange", name: "Orange" },
  ] },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮", carriers: [
    { id: "orange", name: "Orange" }, { id: "mtn", name: "MTN" }, { id: "moov", name: "Moov" },
  ] },
  { code: "SN", name: "Senegal", dialCode: "+221", flag: "🇸🇳", carriers: [
    { id: "orange", name: "Orange" }, { id: "free", name: "Free" }, { id: "expresso", name: "Expresso" },
  ] },
  { code: "TZ", name: "Tanzania", dialCode: "+255", flag: "🇹🇿", carriers: [
    { id: "vodacom", name: "Vodacom" }, { id: "airtel", name: "Airtel" }, { id: "tigo", name: "Tigo" },
  ] },
  { code: "UG", name: "Uganda", dialCode: "+256", flag: "🇺🇬", carriers: [
    { id: "mtn", name: "MTN" }, { id: "airtel", name: "Airtel" },
  ] },
  { code: "ET", name: "Ethiopia", dialCode: "+251", flag: "🇪🇹", carriers: [
    { id: "ethiotelecom", name: "Ethio Telecom" }, { id: "safaricom", name: "Safaricom" },
  ] },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263", flag: "🇿🇼", carriers: [
    { id: "econet", name: "Econet" }, { id: "netone", name: "NetOne" },
  ] },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰", carriers: [
    { id: "jazz", name: "Jazz" }, { id: "zong", name: "Zong" }, { id: "telenor", name: "Telenor" },
  ] },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭", carriers: [
    { id: "globe", name: "Globe" }, { id: "smart", name: "Smart" },
  ] },
];

export function findCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

// Detect the country from a typed international number by longest matching
// dial-code prefix. Ambiguous codes (e.g. +1 US/Canada) resolve to the first
// match; the user can override with the country selector.
export function detectCountry(phone: string): Country | null {
  const normalized = "+" + phone.replace(/[^\d]/g, "");
  let best: Country | null = null;
  for (const c of COUNTRIES) {
    if (normalized.startsWith(c.dialCode) && (!best || c.dialCode.length > best.dialCode.length)) {
      best = c;
    }
  }
  return best;
}

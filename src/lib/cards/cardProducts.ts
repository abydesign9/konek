import { query } from "@/lib/db";

// Card product catalogue + fee schedule. Read by card issuance (creation fee),
// settlement (per-transaction authorization fee), disputes (dispute fee), and
// the customer card page (to display the schedule). All money is minor units.

export interface CardProduct {
  id: string;
  name: string;
  currency: string;
  formFactor: "virtual" | "physical";
  brand: string;
  description: string | null;
  creationFeeMinor: number;
  authorizationFeeMinor: number;
  fundingFeePct: number;
  fundingFeeMinMinor: number;
  fundingFeeMaxMinor: number | null;
  declineFeeMinor: number;
  disputeFeeMinor: number;
  intlFeePct: number;
  intlFeeFixedMinor: number;
  active: boolean;
  sortOrder: number;
}

interface Row {
  id: string;
  name: string;
  currency: string;
  form_factor: "virtual" | "physical";
  brand: string;
  description: string | null;
  creation_fee_minor: string;
  authorization_fee_minor: string;
  funding_fee_pct: string;
  funding_fee_min_minor: string;
  funding_fee_max_minor: string | null;
  decline_fee_minor: string;
  dispute_fee_minor: string;
  intl_fee_pct: string;
  intl_fee_fixed_minor: string;
  active: boolean;
  sort_order: number;
}

const COLS = `id, name, currency, form_factor, brand, description, creation_fee_minor, authorization_fee_minor,
  funding_fee_pct, funding_fee_min_minor, funding_fee_max_minor, decline_fee_minor, dispute_fee_minor,
  intl_fee_pct, intl_fee_fixed_minor, active, sort_order`;

export function toProduct(r: Row): CardProduct {
  return {
    id: r.id,
    name: r.name,
    currency: r.currency,
    formFactor: r.form_factor,
    brand: r.brand,
    description: r.description,
    creationFeeMinor: Number(r.creation_fee_minor),
    authorizationFeeMinor: Number(r.authorization_fee_minor),
    fundingFeePct: Number(r.funding_fee_pct),
    fundingFeeMinMinor: Number(r.funding_fee_min_minor),
    fundingFeeMaxMinor: r.funding_fee_max_minor == null ? null : Number(r.funding_fee_max_minor),
    declineFeeMinor: Number(r.decline_fee_minor),
    disputeFeeMinor: Number(r.dispute_fee_minor),
    intlFeePct: Number(r.intl_fee_pct),
    intlFeeFixedMinor: Number(r.intl_fee_fixed_minor),
    active: r.active,
    sortOrder: r.sort_order,
  };
}

export async function listCardProducts(activeOnly: boolean): Promise<CardProduct[]> {
  const { rows } = await query<Row>(
    `SELECT ${COLS} FROM card_products ${activeOnly ? "WHERE active = true" : ""} ORDER BY sort_order, name`
  );
  return rows.map(toProduct);
}

export async function getCardProduct(id: string): Promise<CardProduct | null> {
  const { rows } = await query<Row>(`SELECT ${COLS} FROM card_products WHERE id = $1`, [id]);
  return rows[0] ? toProduct(rows[0]) : null;
}

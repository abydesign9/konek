// Vendor API credentials come from the environment, never from the database.
// Convention: VENDOR_<UPPERCASE_ID>_<UPPERCASE_KEY>, with non-alphanumerics in
// the id/key folded to underscores. e.g. vendor "vtpass", key "api-key" ->
// VENDOR_VTPASS_API_KEY. This keeps secrets out of vendors.config (which is
// world-readable to anyone with DB access) and out of the ledger/audit trail.
export class MissingVendorSecretError extends Error {
  constructor(envVar: string) {
    super(`Missing vendor secret env var ${envVar}`);
    this.name = "MissingVendorSecretError";
  }
}

function envName(vendorId: string, key: string): string {
  const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return `VENDOR_${norm(vendorId)}_${norm(key)}`;
}

export function getVendorSecret(vendorId: string, key: string): string {
  const name = envName(vendorId, key);
  const value = process.env[name];
  if (!value) throw new MissingVendorSecretError(name);
  return value;
}

export function getVendorSecretOptional(vendorId: string, key: string): string | undefined {
  return process.env[envName(vendorId, key)] || undefined;
}

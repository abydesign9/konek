import { query } from "@/lib/db";
import { PROGRAM_FORMS, PROGRAM_LABEL, isProgramKey, type ProgramKey } from "./programForms";

export interface ApplicationRow {
  id: string;
  program: ProgramKey;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  details: Record<string, string>;
  status: string;
  created_at: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = 2000; // per-field cap — generous for a "why" answer, bounded for safety

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Validate + normalise a public submission. Only whitelisted fields for the
// given program are stored (unknown keys are dropped), and every value is
// length-capped. Returns the row id.
export async function submitApplication(input: Record<string, unknown>): Promise<{ id: string }> {
  const program = input.program;
  if (!isProgramKey(program)) throw new ValidationError("Unknown program");

  const fullName = str(input.fullName);
  const email = str(input.email).toLowerCase();
  const phone = str(input.phone);
  const country = str(input.country);

  if (fullName.length < 2) throw new ValidationError("Please enter your full name");
  if (!EMAIL_RE.test(email)) throw new ValidationError("Please enter a valid email address");
  if (phone.length < 5) throw new ValidationError("Please enter a phone number");
  if (country.length < 2) throw new ValidationError("Please enter your country");
  if (fullName.length > 200 || email.length > 200 || phone.length > 40 || country.length > 100) {
    throw new ValidationError("One of your answers is too long");
  }

  // Only keep answers for fields this program actually defines.
  const details: Record<string, string> = {};
  for (const field of PROGRAM_FORMS[program].fields) {
    const value = str(input[field.name]);
    if (!value) {
      if (field.required) throw new ValidationError(`Please answer: ${field.label}`);
      continue;
    }
    details[field.name] = value.slice(0, MAX);
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO program_applications (program, full_name, email, phone, country, details)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [program, fullName.slice(0, 200), email, phone.slice(0, 40), country.slice(0, 100), JSON.stringify(details)]
  );
  return { id: rows[0].id };
}

export async function listApplications(program?: string): Promise<ApplicationRow[]> {
  const filterProgram = isProgramKey(program) ? program : null;
  const { rows } = await query<ApplicationRow>(
    `SELECT id, program, full_name, email, phone, country, details, status, created_at
     FROM program_applications
     ${filterProgram ? "WHERE program = $1" : ""}
     ORDER BY created_at DESC
     LIMIT 5000`,
    filterProgram ? [filterProgram] : []
  );
  return rows;
}

function csvCell(value: string | number): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Build a CSV for one program: fixed contact columns + one column per detail
// field defined for that program (stable order from the form config).
export function applicationsToCsv(program: ProgramKey, rows: ApplicationRow[]): string {
  const detailFields = PROGRAM_FORMS[program].fields;
  const header = ["Submitted", "Status", "Full name", "Email", "Phone", "Country", ...detailFields.map((f) => f.label)];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.created_at).toISOString(),
        r.status,
        r.full_name,
        r.email,
        r.phone ?? "",
        r.country ?? "",
        ...detailFields.map((f) => r.details?.[f.name] ?? ""),
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return lines.join("\n");
}

export { PROGRAM_LABEL };

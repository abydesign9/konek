"use client";

import { useState } from "react";
import { COMMON_FIELDS, PROGRAM_FORMS, type FormField, type ProgramKey } from "@/lib/programs/programForms";

// Self-contained public application form for a community program. On success it
// shows a thank-you in place — it never sends the visitor into the app portal.
export function ApplicationForm({ program }: { program: ProgramKey }) {
  const config = PROGRAM_FORMS[program];
  const fields: FormField[] = [...COMMON_FIELDS, ...config.fields];

  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  function set(name: string, v: string) {
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");
    const res = await fetch("/api/programs/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program, ...values }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setStatus("idle");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="konek-card-shadow rounded-3xl border border-konek-green/20 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-konek-green/10 text-2xl">✅</div>
        <h3 className="font-heading text-2xl font-bold text-indigo">Application received</h3>
        <p className="mx-auto mt-3 max-w-md text-indigo/60">
          Thanks for applying to the {config.title.replace(/^Apply to (be a |the )?|^Join the /, "")} program. Our team reviews every
          application and will reach out by email if it&apos;s a match.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="konek-card-shadow rounded-3xl border border-indigo/10 bg-white p-6 md:p-8">
      <h3 className="font-heading text-2xl font-bold text-indigo">{config.title}</h3>
      <p className="mt-2 text-sm text-indigo/60">{config.intro}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
            <label htmlFor={f.name} className="mb-1.5 block text-sm font-semibold text-indigo">
              {f.label}
              {f.required && <span className="text-konek-green"> *</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                id={f.name}
                required={f.required}
                rows={3}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={(e) => set(f.name, e.target.value)}
                className="w-full rounded-xl border border-indigo/15 px-4 py-2.5 text-sm outline-none focus:border-konek-green"
              />
            ) : f.type === "select" ? (
              <select
                id={f.name}
                required={f.required}
                value={values[f.name] ?? ""}
                onChange={(e) => set(f.name, e.target.value)}
                className="w-full rounded-xl border border-indigo/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-konek-green"
              >
                <option value="">Select…</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                id={f.name}
                type={f.type === "url" ? "url" : f.type}
                required={f.required}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={(e) => set(f.name, e.target.value)}
                className="w-full rounded-xl border border-indigo/15 px-4 py-2.5 text-sm outline-none focus:border-konek-green"
              />
            )}
            {f.help && <p className="mt-1 text-xs text-indigo/45">{f.help}</p>}
          </div>
        ))}
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 w-full rounded-full bg-indigo px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-konek-green disabled:opacity-50 sm:w-auto sm:px-10"
      >
        {status === "submitting" ? "Submitting…" : "Submit application"}
      </button>
      <p className="mt-3 text-xs text-indigo/45">
        By applying you agree to be contacted about this program. We&apos;ll never share your details.
      </p>
    </form>
  );
}

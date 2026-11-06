"use client";

import { Fragment, useEffect, useState } from "react";
import { PROGRAM_FORMS, PROGRAM_LABEL, type ProgramKey } from "@/lib/programs/programForms";

interface Application {
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

const TABS: ProgramKey[] = ["ambassador", "influencer", "creator_club"];

export function ProgramApplicationsConsole() {
  const [program, setProgram] = useState<ProgramKey>("ambassador");
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/program-applications?program=${program}`)
      .then((r) => r.json())
      .then((d) => setRows(d.applications ?? []))
      .finally(() => setLoading(false));
  }, [program]);

  const detailFields = PROGRAM_FORMS[program].fields;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-indigo">Program applications</h1>
          <p className="text-sm text-indigo/55">Campus Ambassadors, Influencers and Creator Club submissions.</p>
        </div>
        <a
          href={`/api/admin/program-applications/export?program=${program}`}
          className="rounded-xl bg-indigo px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          ⬇ Export CSV
        </a>
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setProgram(t); setExpanded(null); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              program === t ? "bg-indigo text-white" : "bg-indigo/5 text-indigo/70 hover:bg-indigo/10"
            }`}
          >
            {PROGRAM_LABEL[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-indigo/50">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-indigo/15 py-12 text-center text-indigo/50">
          No {PROGRAM_LABEL[program]} applications yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-indigo/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-indigo/10 bg-indigo/[0.03] text-xs uppercase tracking-wide text-indigo/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Country</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-b border-indigo/5">
                    <td className="px-4 py-3 text-indigo/60">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold text-indigo">{r.full_name}</td>
                    <td className="px-4 py-3 text-indigo/70">{r.email}</td>
                    <td className="px-4 py-3 text-indigo/70">{r.country}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className="text-xs font-semibold text-raviion-green"
                      >
                        {expanded === r.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="border-b border-indigo/5 bg-indigo/[0.02]">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Detail label="Phone" value={r.phone} />
                          {detailFields.map((f) => (
                            <Detail key={f.name} label={f.label} value={r.details?.[f.name]} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo/40">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-indigo/75">{value}</p>
    </div>
  );
}

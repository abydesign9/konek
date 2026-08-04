"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Grid, PageHeader } from "@/components/adminUi";

interface Method {
  code: string;
  label: string;
  kind: string;
  active: boolean;
}
interface Provider {
  id: string;
  name: string;
  adapter_key: string;
  countries: string[];
  methods: string[];
  priority: number;
  enabled: boolean;
}
interface Requirement {
  id: string;
  country_code: string | null;
  tier: number;
  method_groups: string[][];
  label: string | null;
  active: boolean;
}

export function KycConfigConsole() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // add/edit requirement form
  const [country, setCountry] = useState("");
  const [tier, setTier] = useState("1");
  const [groupsText, setGroupsText] = useState("");
  const [label, setLabel] = useState("");

  function load() {
    fetch("/api/admin/kyc/config")
      .then((r) => r.json())
      .then((d) => {
        setMethods(d.methods ?? []);
        setProviders(d.providers ?? []);
        setRequirements((d.requirements ?? []).filter((r: Requirement) => r.active));
      });
  }
  useEffect(load, []);

  const byCountry = useMemo(() => {
    const m = new Map<string, Requirement[]>();
    for (const r of requirements) {
      const k = r.country_code ?? "🌍 Global default";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    for (const list of m.values()) list.sort((a, b) => a.tier - b.tier);
    return [...m.entries()].sort((a, b) => (a[0] === "🌍 Global default" ? -1 : a[0].localeCompare(b[0])));
  }, [requirements]);

  async function saveRequirement() {
    // "bvn,nin | selfie_liveness" -> [["bvn","nin"],["selfie_liveness"]]
    const methodGroups = groupsText
      .split("|")
      .map((g) => g.split(",").map((s) => s.trim()).filter(Boolean))
      .filter((g) => g.length > 0);
    if (methodGroups.length === 0) return setMsg("Enter at least one method group");
    const res = await fetch("/api/admin/kyc/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode: country.trim() || null, tier: Number(tier), methodGroups, label: label.trim() || null }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Saved." : d.error ?? "Failed");
    if (res.ok) {
      setGroupsText("");
      setLabel("");
      load();
    }
  }

  async function editRequirement(r: Requirement) {
    setCountry(r.country_code ?? "");
    setTier(String(r.tier));
    setGroupsText(r.method_groups.map((g) => g.join(",")).join(" | "));
    setLabel(r.label ?? "");
  }

  async function removeRequirement(id: string) {
    if (!confirm("Deactivate this requirement?")) return;
    await fetch(`/api/admin/kyc/config?id=${id}`, { method: "DELETE" });
    load();
  }

  async function toggleProvider(p: Provider) {
    await fetch("/api/admin/kyc/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId: p.id, enabled: !p.enabled }),
    });
    load();
  }

  const methodLabel = (code: string) => methods.find((m) => m.code === code)?.label ?? code;

  return (
    <>
      <PageHeader
        title="KYC configuration"
        description="Konek is global: BVN/NIN apply only to Nigeria, and every country has its own accepted IDs. This matrix decides, per country and tier, which verification methods a customer must complete. Adding a country or provider needs no code change."
      />
      {msg && <p className="mb-3 text-sm font-semibold text-konek-green">{msg}</p>}

      <Grid>
        <div className="col-span-1 lg:col-span-7">
          <Card title="Requirement matrix (country → tier → methods)">
            <div className="space-y-5">
              {byCountry.map(([cc, list]) => (
                <div key={cc}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">{cc}</p>
                  <div className="space-y-2">
                    {list.map((r) => (
                      <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-border-soft p-3">
                        <div>
                          <p className="text-sm font-semibold text-indigo">
                            Tier {r.tier}
                            {r.label ? `: ${r.label}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-text-secondary">
                            {r.method_groups
                              .map((g) => g.map(methodLabel).join(" or "))
                              .join("  +  ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => editRequirement(r)} className="text-xs font-semibold text-indigo">
                            Edit
                          </button>
                          <button onClick={() => removeRequirement(r.id)} className="text-xs font-semibold text-red-600">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-5">
          <Card title="Add / edit a requirement">
            <div className="space-y-3">
              <div className="flex gap-2">
                <label className="flex-1 text-xs text-text-secondary">
                  Country (ISO2, blank = global)
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                    placeholder="NG"
                    className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm"
                  />
                </label>
                <label className="w-24 text-xs text-text-secondary">
                  Tier
                  <select value={tier} onChange={(e) => setTier(e.target.value)} className="mt-1 w-full rounded-lg border border-border-soft px-2 py-2 text-sm">
                    <option value="1">1 · Transact</option>
                    <option value="2">2 · Finance</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs text-text-secondary">
                Method groups. Comma separates alternatives, <code>|</code> means AND
                <input
                  value={groupsText}
                  onChange={(e) => setGroupsText(e.target.value)}
                  placeholder="bvn,nin | selfie_liveness"
                  className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-text-secondary">
                Label (optional)
                <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 text-sm" />
              </label>
              <button onClick={saveRequirement} className="w-full rounded-lg bg-indigo py-2.5 text-sm font-semibold text-white">
                Save requirement
              </button>
              <p className="text-[11px] text-text-secondary">
                Available methods: {methods.filter((m) => m.active).map((m) => m.code).join(", ")}
              </p>
            </div>
          </Card>

          <div className="mt-6">
            <Card title="Providers (routed by country + method)">
              <div className="space-y-2">
                {providers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-border-soft p-3">
                    <div>
                      <p className="text-sm font-semibold text-indigo">{p.name}</p>
                      <p className="mt-0.5 text-[11px] text-text-secondary">
                        {p.countries.join(", ")} · {p.methods.length} methods · priority {p.priority}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleProvider(p)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${p.enabled ? "bg-konek-green/10 text-konek-green" : "bg-disabled-bg text-text-secondary"}`}
                    >
                      {p.enabled ? "enabled" : "disabled"}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Grid>
    </>
  );
}

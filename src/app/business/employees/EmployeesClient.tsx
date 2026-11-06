"use client";

import { useEffect, useState } from "react";
import { BusinessShell } from "@/components/BusinessShell";
import { NetworkLogo } from "@/components/NetworkLogo";

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
  phone: string;
  network: string;
  status: string;
}

const NETWORKS = ["mtn", "glo", "airtel", "9mobile"];

export function EmployeesClient() {
  const [businessName, setBusinessName] = useState<string | undefined>();
  const [canManage, setCanManage] = useState(false);
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [showAdd, setShowAdd] = useState<"single" | "bulk" | null>(null);

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [network, setNetwork] = useState("mtn");
  const [bulkText, setBulkText] = useState("David Johnson, Sales, mtn, 08011112222\nSarah James, Operations, airtel, 08022223333");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/business/me")
      .then((r) => r.json())
      .then((d) => {
        setBusinessName(d.business?.legal_name);
        setCanManage(d.role === "owner" || d.role === "admin" || d.role === "hr");
      });
    fetch("/api/business/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees ?? []));
  }
  useEffect(load, []);

  function resetForm() {
    setFullName("");
    setDepartment("");
    setPhone("");
    setNetwork("mtn");
    setShowAdd(null);
    setError(null);
  }

  async function addSingle() {
    if (!fullName.trim() || phone.length < 10) {
      setError("Name and a valid phone number are required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/business/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, department: department || null, phone, network }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not add employee");
      return;
    }
    resetForm();
    load();
  }

  async function addBulk() {
    const rows = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, dept, net, ph] = line.split(",").map((s) => s.trim());
        return { fullName: name, department: dept || null, network: net, phone: ph };
      });
    if (rows.length === 0) {
      setError("Add at least one row");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/business/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not import employees");
      return;
    }
    resetForm();
    load();
  }

  async function toggleStatus(e: Employee) {
    const next = e.status === "active" ? "inactive" : "active";
    await fetch(`/api/business/employees/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this employee from your directory?")) return;
    await fetch(`/api/business/employees/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <BusinessShell businessName={businessName}>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-indigo">Employees</h1>
            <p className="mt-1 text-sm text-text-secondary">Everyone who can receive a benefit from your business.</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <a
                href="/api/business/employees/export"
                className="rounded-lg border border-border-soft bg-white px-4 py-2 text-sm font-semibold text-indigo hover:bg-hover-tint"
              >
                Export
              </a>
              <button
                onClick={() => setShowAdd("bulk")}
                className="rounded-lg border border-border-soft bg-white px-4 py-2 text-sm font-semibold text-indigo hover:bg-hover-tint"
              >
                Import Employee List
              </button>
              <button
                onClick={() => setShowAdd("single")}
                className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-indigo/90"
              >
                Add Employee
              </button>
            </div>
          )}
        </div>

        {showAdd === "single" && (
          <div className="raviion-card-shadow mt-5 rounded-2xl bg-white p-5">
            <p className="mb-3 font-heading text-sm font-bold text-indigo">Add employee</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="rounded-xl border border-border-soft px-4 py-2.5 text-sm"
              />
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Department (optional)"
                className="rounded-xl border border-border-soft px-4 py-2.5 text-sm"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="rounded-xl border border-border-soft px-4 py-2.5 text-sm"
              />
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="rounded-xl border border-border-soft px-4 py-2.5 text-sm capitalize"
              >
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={addSingle} disabled={saving} className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Adding…" : "Add"}
              </button>
              <button onClick={resetForm} className="rounded-lg border border-border-soft px-4 py-2 text-sm font-semibold text-indigo">
                Cancel
              </button>
            </div>
          </div>
        )}

        {showAdd === "bulk" && (
          <div className="raviion-card-shadow mt-5 rounded-2xl bg-white p-5">
            <p className="mb-1 font-heading text-sm font-bold text-indigo">Import employee list</p>
            <p className="mb-3 text-xs text-text-secondary">One employee per line: name, department, network, phone</p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-border-soft px-4 py-2.5 text-sm font-mono"
            />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={addBulk} disabled={saving} className="rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Importing…" : "Import"}
              </button>
              <button onClick={resetForm} className="rounded-lg border border-border-soft px-4 py-2 text-sm font-semibold text-indigo">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="raviion-card-shadow mt-5 overflow-hidden rounded-2xl bg-white">
          {employees === null && <p className="px-5 py-8 text-center text-sm text-text-secondary">Loading…</p>}
          {employees?.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-text-secondary">
              No employees yet. Add your first one to start distributing benefits.
            </p>
          )}
          {employees && employees.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border-soft text-xs uppercase tracking-wide text-text-secondary">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  {canManage && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-border-soft last:border-0">
                    <td className="px-5 py-3.5 font-medium text-indigo">{e.full_name}</td>
                    <td className="px-5 py-3.5 text-text-secondary">{e.department || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2">
                        <NetworkLogo network={e.network} size={20} />
                        <span className="text-text-secondary">{e.phone}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          e.status === "active" ? "bg-raviion-green/15 text-raviion-green" : "bg-text-secondary/10 text-text-secondary"
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => toggleStatus(e)} className="mr-3 text-xs font-semibold text-indigo hover:underline">
                          {e.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => remove(e.id)} className="text-xs font-semibold text-red-600 hover:underline">
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}

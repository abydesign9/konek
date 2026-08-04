"use client";

import { useEffect, useState } from "react";
import { Card, Grid, PageHeader } from "@/components/adminUi";

interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  active: boolean;
}

interface Role {
  name: string;
  description: string | null;
}

interface PermissionType {
  key: string;
  label: string;
}

interface Permission {
  key: string;
  type_key: string;
  label: string;
}

export function UsersConsole() {
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionTypes, setPermissionTypes] = useState<PermissionType[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("support");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function loadAdmins() {
    fetch("/api/admin/admin-users")
      .then((res) => res.json())
      .then((data) => setAdmins(data.admins ?? []));
  }

  function loadRoles() {
    fetch("/api/admin/roles")
      .then((res) => res.json())
      .then((data) => {
        setRoles(data.roles ?? []);
        setPermissionTypes(data.permissionTypes ?? []);
        setPermissions(data.permissions ?? []);
        setMatrix(data.matrix ?? {});
      });
  }

  useEffect(() => {
    loadAdmins();
    loadRoles();
  }, []);

  async function invite() {
    if (!newEmail.trim()) return;
    setInviting(true);
    setMessage(null);
    const res = await fetch("/api/admin/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, role: newRole }),
    });
    setInviting(false);
    const body = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Admin added" : body.error ?? "Failed");
    if (res.ok) {
      setNewEmail("");
      loadAdmins();
    }
  }

  async function deactivate(id: string) {
    await fetch(`/api/admin/admin-users/${id}/deactivate`, { method: "POST" });
    loadAdmins();
  }

  async function changeRole(id: string, role: string) {
    const res = await fetch(`/api/admin/admin-users/${id}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) loadAdmins();
  }

  function togglePermission(role: string, key: string) {
    setMatrix((m) => {
      const current = m[role] ?? [];
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      return { ...m, [role]: next };
    });
    setDirty((d) => ({ ...d, [role]: true }));
  }

  async function saveRole(role: string) {
    setSavingRole(role);
    await fetch(`/api/admin/roles/${role}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionKeys: matrix[role] ?? [] }),
    });
    setSavingRole(null);
    setDirty((d) => ({ ...d, [role]: false }));
  }

  return (
    <>
      <PageHeader title="Users & roles" description="Manage admin accounts and what each role can do." />

      <Grid>
        <div className="col-span-1 lg:col-span-12">
          <Card title="Admin users">
            <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {admins.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 rounded-xl border border-border-soft px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-indigo">{a.email}</p>
                    <p className="text-xs text-text-secondary">{a.active ? "Active" : "Deactivated"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={a.role}
                      onChange={(e) => changeRole(a.id, e.target.value)}
                      disabled={!a.active}
                      className="rounded-lg border border-border-soft px-2 py-1.5 text-xs disabled:opacity-50"
                    >
                      {roles.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    {a.active && (
                      <button onClick={() => deactivate(a.id)} className="text-xs font-semibold text-red-600 underline">
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {admins.length === 0 && <p className="text-sm text-text-secondary">No admins yet.</p>}
            </div>
            <div className="flex flex-col gap-2 border-t border-border-soft pt-4 sm:flex-row">
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="new-admin@konek.app"
                className="w-full rounded-lg border border-border-soft px-3 py-2 text-sm sm:flex-1"
              />
              <div className="flex gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="rounded-lg border border-border-soft px-2 py-2 text-sm"
                >
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={invite}
                  disabled={inviting}
                  className="shrink-0 rounded-lg bg-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Invite
                </button>
              </div>
            </div>
            {message && <p className="mt-2 text-xs text-text-secondary">{message}</p>}
          </Card>
        </div>

        {roles.map((role) => (
          <div key={role.name} className="col-span-1 lg:col-span-4">
            <Card
              title={role.name.replace(/_/g, " ")}
              description={role.description ?? undefined}
              className="capitalize h-full"
              action={
                dirty[role.name] && (
                  <button
                    onClick={() => saveRole(role.name)}
                    disabled={savingRole === role.name}
                    className="shrink-0 text-xs font-semibold text-konek-green underline disabled:opacity-50 normal-case"
                  >
                    {savingRole === role.name ? "Saving…" : "Save changes"}
                  </button>
                )
              }
            >
              <div className="normal-case">
                {permissionTypes.map((type) => {
                  const typePermissions = permissions.filter((p) => p.type_key === type.key);
                  if (typePermissions.length === 0) return null;
                  return (
                    <div key={type.key} className="mb-3 last:mb-0">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                        {type.label}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {typePermissions.map((p) => (
                          <label key={p.key} className="flex items-center gap-2 text-sm text-indigo">
                            <input
                              type="checkbox"
                              checked={(matrix[role.name] ?? []).includes(p.key)}
                              onChange={() => togglePermission(role.name, p.key)}
                              className="rounded border-border-soft"
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ))}
      </Grid>
    </>
  );
}

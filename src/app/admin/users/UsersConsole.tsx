"use client";

import { useEffect, useState } from "react";

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
      <h1 className="font-heading text-xl font-bold text-indigo mb-1">Users &amp; roles</h1>
      <p className="text-sm text-indigo/60 mb-6">Manage admin accounts and what each role can do.</p>

      <section className="rounded-2xl border border-indigo/10 bg-white p-5 mb-8">
        <p className="text-sm font-semibold text-indigo mb-3">Admin users</p>
        <div className="flex flex-col gap-2 mb-4">
          {admins.map((a) => (
            <div
              key={a.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-indigo/10 px-4 py-3"
            >
              <div className="min-w-0 sm:flex-1">
                <p className="text-sm text-indigo truncate">{a.email}</p>
                <p className="text-xs text-indigo/50">{a.active ? "Active" : "Deactivated"}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={a.role}
                  onChange={(e) => changeRole(a.id, e.target.value)}
                  disabled={!a.active}
                  className="rounded-lg border border-indigo/20 px-2 py-1.5 text-xs disabled:opacity-50"
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
          {admins.length === 0 && <p className="text-sm text-indigo/50">No admins yet.</p>}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new-admin@konek.app"
            className="w-full sm:flex-1 rounded-lg border border-indigo/20 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="rounded-lg border border-indigo/20 px-2 py-2 text-sm"
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
              className="shrink-0 rounded-lg bg-indigo text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
            >
              Invite
            </button>
          </div>
        </div>
        {message && <p className="text-xs text-indigo/60 mt-2">{message}</p>}
      </section>

      <section>
        <p className="text-sm font-semibold text-indigo mb-3">Roles &amp; permissions</p>
        <div className="flex flex-col gap-4">
          {roles.map((role) => (
            <div key={role.name} className="rounded-2xl border border-indigo/10 bg-white p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-indigo capitalize">{role.name.replace(/_/g, " ")}</p>
                {dirty[role.name] && (
                  <button
                    onClick={() => saveRole(role.name)}
                    disabled={savingRole === role.name}
                    className="text-xs font-semibold text-konek-green underline disabled:opacity-50"
                  >
                    {savingRole === role.name ? "Saving…" : "Save changes"}
                  </button>
                )}
              </div>
              {role.description && <p className="text-xs text-indigo/50 mb-3">{role.description}</p>}
              {permissionTypes.map((type) => {
                const typePermissions = permissions.filter((p) => p.type_key === type.key);
                if (typePermissions.length === 0) return null;
                return (
                  <div key={type.key} className="mb-3 last:mb-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo/40 mb-1.5">
                      {type.label}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {typePermissions.map((p) => (
                        <label key={p.key} className="flex items-center gap-2 text-sm text-indigo">
                          <input
                            type="checkbox"
                            checked={(matrix[role.name] ?? []).includes(p.key)}
                            onChange={() => togglePermission(role.name, p.key)}
                            className="rounded border-indigo/30"
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

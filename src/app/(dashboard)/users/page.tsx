"use client";

import { useState, useEffect } from "react";

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  CASHIER: { label: "Kasir", color: "bg-emerald-100 text-emerald-700" },
  HEAD_CASHIER: { label: "Head Kasir", color: "bg-violet-100 text-violet-700" },
  FINANCE: { label: "Finance", color: "bg-blue-100 text-blue-700" },
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  const [form, setForm] = useState({
    username: "",
    full_name: "",
    role: "CASHIER",
    password: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal memuat data user.");
        return;
      }
      setUsers(data.data ?? []);
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal membuat user.");
      return;
    }

    setSuccess("User berhasil dibuat.");
    setShowForm(false);
    setForm({ username: "", full_name: "", role: "CASHIER", password: "" });
    fetchUsers();
    setTimeout(() => setSuccess(""), 3000);
  }

  async function toggleActive(userId: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal mengubah status user.");
        setTimeout(() => setError(""), 4000);
        return;
      }

      fetchUsers();
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setTimeout(() => setError(""), 4000);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/users/${confirmDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal menghapus user.");
        setConfirmDelete(null);
        setSaving(false);
        return;
      }

      setSuccess("User berhasil dihapus.");
      setConfirmDelete(null);
      setSaving(false);
      fetchUsers();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
      setConfirmDelete(null);
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (resetPassword.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setResetSaving(true);
    setError("");

    const res = await fetch(`/api/users/${resetTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });

    const data = await res.json();
    setResetSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal reset password.");
      return;
    }

    setSuccess(`Password ${resetTarget.full_name} berhasil direset.`);
    setResetTarget(null);
    setResetPassword("");
    setTimeout(() => setSuccess(""), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Kelola User</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Manajemen akun pengguna sistem
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setError("");
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Tambah User
        </button>
      </div>

      {/* Error global */}
      {error && !showForm && !resetTarget && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex items-center gap-4 animate-pulse">
                <div className="h-3 rounded" style={{width:"18%",backgroundColor:"var(--surface-hover)"}} />
                <div className="h-3 rounded" style={{width:"13%",backgroundColor:"var(--surface-hover)"}} />
                <div className="h-5 rounded-full" style={{width:"10%",backgroundColor:"var(--surface-hover)"}} />
                <div className="h-5 rounded-full" style={{width:"9%",backgroundColor:"var(--surface-hover)"}} />
                <div className="h-3 rounded" style={{width:"12%",backgroundColor:"var(--surface-hover)"}} />
                <div className="h-7 rounded-lg" style={{width:"8%",backgroundColor:"var(--surface-hover)"}} />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-hover)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium uppercase tracking-wide" style={{color:"var(--text-tertiary)",fontSize:"11px"}}>
                  Nama
                </th>
                <th className="text-left px-4 py-3 font-medium uppercase tracking-wide" style={{color:"var(--text-tertiary)",fontSize:"11px"}}>
                  Username
                </th>
                <th className="text-left px-4 py-3 font-medium uppercase tracking-wide" style={{color:"var(--text-tertiary)",fontSize:"11px"}}>
                  Role
                </th>
                <th className="text-left px-4 py-3 font-medium uppercase tracking-wide" style={{color:"var(--text-tertiary)",fontSize:"11px"}}>
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium uppercase tracking-wide" style={{color:"var(--text-tertiary)",fontSize:"11px"}}>
                  Dibuat
                </th>
                <th className="text-left px-4 py-3 font-medium uppercase tracking-wide" style={{color:"var(--text-tertiary)",fontSize:"11px"}}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const role = ROLE_LABEL[user.role];
                return (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {user.full_name}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {user.username}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${role?.color}`}
                      >
                        {role?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {user.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {new Date(user.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(user.id, user.is_active)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                            user.is_active
                              ? "bg-red-50 hover:bg-red-100 text-red-600"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>

                        {/* Reset password hanya untuk non-Finance */}
                        {user.role !== "FINANCE" && (
                          <button
                            onClick={() => {
                              setResetTarget(user);
                              setResetPassword("");
                              setError("");
                            }}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 transition"
                          >
                            Reset Password
                          </button>
                        )}

                        {/* Hapus hanya jika belum pernah buat shift */}
                        {!user.has_shifts && (
                          <button
                            onClick={() => setConfirmDelete(user)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] hover:bg-red-50 text-[var(--text-tertiary)] hover:text-red-600 border border-[var(--border)] hover:border-red-200 transition"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Reset Password */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-violet-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">
                  Reset Password
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  untuk
                  <span className="font-semibold text-[var(--foreground)]">
                    {resetTarget.full_name}
                  </span>
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Password Baru
              </label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  setResetTarget(null);
                  setResetPassword("");
                  setError("");
                }}
                disabled={resetSaving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] transition"
              >
                Batal
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetSaving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition"
              >
                {resetSaving ? "Menyimpan..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--foreground)]">
                  Hapus User
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  Tindakan ini tidak dapat dibatalkan
                </p>
              </div>
            </div>

            <div className="bg-[var(--surface-hover)] rounded-lg p-3 text-sm">
              <p className="text-[var(--muted)]">Kamu akan menghapus:</p>
              <p className="font-semibold text-[var(--foreground)] mt-1">
                {confirmDelete.full_name}
              </p>
              <p className="text-[var(--muted)] text-xs">
                {confirmDelete.username} ·
                {ROLE_LABEL[confirmDelete.role]?.label}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition"
              >
                {saving ? "Menghapus..." : "Hapus User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah User */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Tambah User Baru
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, full_name: e.target.value }))
                  }
                  placeholder="Nama lengkap"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, username: e.target.value }))
                  }
                  placeholder="Username untuk login"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, role: e.target.value }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="CASHIER">Kasir</option>
                  <option value="HEAD_CASHIER">Head Kasir</option>
                  <option value="FINANCE">Finance</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, password: e.target.value }))
                  }
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

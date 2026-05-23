"use client";

import { useState } from "react";

export default function ChangePasswordModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit() {
    setError("");
    if (form.new_password !== form.confirm_password) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/users/me/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_password: form.current_password,
        new_password: form.new_password,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal mengubah password.");
      return;
    }
    setSuccess("Password berhasil diubah.");
    setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--surface)] rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-[var(--foreground)]">Ganti Password</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div className="space-y-3">
          {[
            { label: "Password Lama", key: "current_password" },
            { label: "Password Baru", key: "new_password" },
            { label: "Konfirmasi Password Baru", key: "confirm_password" },
          ].map(({ label, key }) => (
            <div key={key} className="space-y-1">
              <label className="text-sm font-medium text-[var(--foreground)]">
                {label}
              </label>
              <input
                type="password"
                value={form[key as keyof typeof form]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-[var(--text-tertiary)]"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-hover)] transition"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

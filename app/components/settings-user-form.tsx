"use client";

import type { FormEvent } from "react";
import type {
  RoleDefinition,
  RoleKey,
} from "../../shared/config";

export function SettingsUserForm({
  editingUserId,
  name,
  username,
  password,
  role,
  roles,
  error,
  onNameChange,
  onUsernameChange,
  onPasswordChange,
  onRoleChange,
  onSubmit,
  onCancel,
}: {
  editingUserId: string | null;
  name: string;
  username: string;
  password: string;
  role: RoleKey;
  roles: RoleDefinition[];
  error: string;
  onNameChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRoleChange: (value: RoleKey) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form className="user-form" onSubmit={onSubmit}>
      <div className="user-form-heading">
        <div>
          <strong>{editingUserId ? "Edit pengguna" : "Tambah pengguna"}</strong>
          <p>Satu pengguna memiliki satu role utama.</p>
        </div>
        <span>Tersimpan aman</span>
      </div>
      <div className="user-form-grid">
        <label>
          <span>Nama lengkap</span>
          <input
            value={name}
            placeholder="Contoh: Siti Rahma"
            autoFocus
            onChange={(event) => onNameChange(event.target.value)}
          />
        </label>
        <label>
          <span>Username</span>
          <input
            value={username}
            placeholder="contoh: siti.rahma"
            onChange={(event) => onUsernameChange(event.target.value)}
          />
        </label>
        <label>
          <span>Role</span>
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
          >
            {roles
              .filter(
                (item) =>
                  item.active ||
                  (editingUserId !== null && item.key === role),
              )
              .map((item) => (
                <option value={item.key} key={item.key}>
                  {item.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          <span>Password {editingUserId ? "(opsional)" : ""}</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            minLength={10}
            placeholder={
              editingUserId
                ? "Kosongkan jika tidak diubah"
                : "Minimal 10 karakter"
            }
            onChange={(event) => onPasswordChange(event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p className="user-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="user-form-actions">
        <button type="submit">
          {editingUserId ? "Simpan perubahan" : "Tambahkan pengguna"}
        </button>
        <button className="cancel-action" type="button" onClick={onCancel}>
          Batal
        </button>
      </div>
    </form>
  );
}

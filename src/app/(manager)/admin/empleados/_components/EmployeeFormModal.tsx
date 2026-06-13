"use client";
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";

const POS_ROLES = ["pos", "organizer", "empleado", "supervisor"] as const;
type PosRole = (typeof POS_ROLES)[number];
type AnyRole = PosRole | "manager";

const roleLabels: Record<AnyRole, string> = {
  pos: "Caja",
  organizer: "Organizador",
  empleado: "Empleado",
  supervisor: "Supervisor",
  manager: "Manager",
};

interface Store {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: AnyRole;
  active: boolean;
  assignedStore?: string | null;
  hasManagerCode?: boolean;
}

interface Props {
  employee: Employee | null;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EmployeeFormModal({
  employee,
  isSuperAdmin,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!employee;

  const [form, setForm] = useState({
    name: employee?.name ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    role: (employee?.role ?? "pos") as AnyRole,
    active: employee?.active ?? true,
    assignedStore: employee?.assignedStore ?? "",
    password: "",
    managerCode: "",
  });
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveDebug, setSaveDebug] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) =>
        setStores(
          Array.isArray(data) ? data.filter((s: Store) => s.isActive) : [],
        ),
      );
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isEdit && !form.password) {
      setError("La contraseña es obligatoria al crear un empleado.");
      return;
    }

    if (form.managerCode && !/^\d{6}$/.test(form.managerCode)) {
      setError(
        "El código de manager debe ser exactamente 6 dígitos numéricos.",
      );
      return;
    }

    setSaving(true);
    try {
      const url = isEdit ? `/api/employees/${employee._id}` : "/api/employees";
      const method = isEdit ? "PUT" : "POST";
      const body: any = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        active: form.active,
        assignedStore: form.assignedStore || null,
      };
      if (form.password) {
        if (isEdit) {
          body.newPassword = form.password;
        } else {
          body.password = form.password;
        }
      }
      if (form.managerCode) {
        if (isEdit) {
          body.newManagerCode = form.managerCode;
        } else {
          body.managerCode = form.managerCode;
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al guardar");
        setSaveDebug(`HTTP ${res.status} — ${JSON.stringify(data)}`);
        return;
      }
      setSaveDebug(null);
      onSaved();
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-lg">
            {isEdit ? "Editar Empleado" : "Nuevo Empleado"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="px-6 py-5 space-y-4 overflow-y-auto flex-1"
        >
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              required
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Nombre del empleado"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Correo electrónico <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="correo@empresa.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="10 dígitos"
            />
          </div>

          {/* Role + Store row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Rol <span className="text-red-500">*</span>
              </label>
              <select
                required
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {POS_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
                {isSuperAdmin && (
                  <option value="manager">{roleLabels["manager"]}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Sucursal asignada
              </label>
              <select
                name="assignedStore"
                value={form.assignedStore}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— Sin asignar —</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Contraseña {!isEdit && <span className="text-red-500">*</span>}
              {isEdit && (
                <span className="text-muted-foreground font-normal ml-1 text-xs">
                  (dejar en blanco para no cambiar)
                </span>
              )}
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={isEdit ? "••••••••" : "Contraseña de acceso"}
            />
          </div>

          {/* Manager code — visible when role is "manager" or "supervisor" */}
          {(form.role === "manager" || form.role === "supervisor") && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Código de Autorización{" "}
                <span className="text-muted-foreground font-normal text-xs">
                  (6 dígitos —{" "}
                  {isEdit && employee?.hasManagerCode
                    ? "ya tiene código, dejar en blanco para no cambiar"
                    : "opcional"}
                  )
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="mgr_authorization_code"
                  id="managerCode-field"
                  value={form.managerCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setForm((prev) => ({ ...prev, managerCode: v }));
                  }}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary tracking-widest font-mono"
                  placeholder={
                    isEdit && employee?.hasManagerCode
                      ? "tiene código activo"
                      : "ej. 123456"
                  }
                />
              </div>
              {form.managerCode.length > 0 && form.managerCode.length < 6 && (
                <p className="text-xs text-amber-500 mt-1">
                  {form.managerCode.length}/6 dígitos
                </p>
              )}
              {form.managerCode.length === 6 && (
                <p className="text-xs text-green-600 mt-1">✓ Código completo</p>
              )}
            </div>
          )}

          {/* Active toggle (edit mode only) */}
          {isEdit && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={form.active}
                onChange={handleChange}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="active" className="text-sm font-medium">
                Cuenta activa
              </label>
            </div>
          )}

          {/* Footer */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              ⚠ {error}
            </p>
          )}
          {saveDebug && (
            <pre className="text-xs text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg px-3 py-2 whitespace-pre-wrap break-all">
              {saveDebug}
            </pre>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving
                ? "Guardando..."
                : isEdit
                  ? "Actualizar"
                  : "Crear Empleado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

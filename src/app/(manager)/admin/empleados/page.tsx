"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  MdAdd,
  MdEdit,
  MdToggleOn,
  MdToggleOff,
  MdBadge,
  MdSearch,
} from "react-icons/md";
import EmployeeFormModal from "./_components/EmployeeFormModal";

const POS_ROLES = ["pos", "organizer", "empleado"] as const;
type PosRole = (typeof POS_ROLES)[number];
type AnyRole = PosRole | "manager";

const roleLabels: Record<AnyRole, string> = {
  pos: "Caja",
  organizer: "Organizador",
  empleado: "Empleado",
  manager: "Manager",
};

const roleBadgeColors: Record<AnyRole, string> = {
  pos: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  organizer:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  empleado:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  manager: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: AnyRole;
  active: boolean;
  assignedStore?: string | null;
}

interface Store {
  _id: string;
  name: string;
  isActive: boolean;
}

export default function EmployeesAdminPage() {
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "super_admin";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Load stores once for name lookup
  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => setStores(Array.isArray(data) ? data : []));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (roleFilter) params.set("role", roleFilter);
    params.set("limit", "100");

    fetch(`/api/employees?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [keyword, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = async (emp: Employee) => {
    await fetch(`/api/employees/${emp._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !emp.active }),
    });
    load();
  };

  const getStoreName = (storeId?: string | null) => {
    if (!storeId) return "—";
    const found = stores.find((s) => s._id === storeId);
    return found ? found.name : "—";
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MdBadge size={28} className="text-primary" />
            Empleados POS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona las cuentas del personal que accede al módulo de Punto de
            Venta.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEmployee(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <MdAdd size={18} /> Nuevo Empleado
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <MdSearch
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos los roles</option>
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

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm animate-pulse">
          Cargando empleados...
        </div>
      ) : employees.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          No se encontraron empleados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium">Rol</th>
                <th className="text-left px-4 py-3 font-medium">Sucursal</th>
                <th className="text-center px-4 py-3 font-medium">Estado</th>
                <th className="text-center px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((emp) => (
                <tr
                  key={emp._id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{emp.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {emp.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {emp.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        roleBadgeColors[emp.role] ??
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {roleLabels[emp.role] ?? emp.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {getStoreName(emp.assignedStore)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(emp)}
                      disabled={emp.role === "manager" && !isSuperAdmin}
                      title={emp.active ? "Desactivar" : "Activar"}
                      className="transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {emp.active ? (
                        <MdToggleOn
                          size={28}
                          className="text-green-500 hover:text-green-600"
                        />
                      ) : (
                        <MdToggleOff
                          size={28}
                          className="text-muted-foreground hover:text-foreground"
                        />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setEditingEmployee(emp);
                        setShowForm(true);
                      }}
                      disabled={emp.role === "manager" && !isSuperAdmin}
                      title={
                        emp.role === "manager" && !isSuperAdmin
                          ? "Solo super_admin puede editar managers"
                          : "Editar"
                      }
                      className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <MdEdit size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <EmployeeFormModal
          employee={editingEmployee}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

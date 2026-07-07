"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  MdPointOfSale,
  MdInventory2,
  MdAssignment,
  MdBarChart,
  MdArrowBack,
  MdAccountBalance,
  MdDarkMode,
  MdLightMode,
  MdAddBox,
  MdPieChart,
  MdTableChart,
  MdFactCheck,
} from "react-icons/md";
import { FiBarChart, FiLogOut } from "react-icons/fi";
import { BsChevronBarLeft, BsChevronBarRight } from "react-icons/bs";

interface POSSidebarProps {
  storeSlug: string;
  storeName: string;
}

export default function POSSidebar({ storeSlug, storeName }: POSSidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const base = `/puntodeventa/${storeSlug}`;
  const { data: session } = useSession();
  const hasAssignedStore = !!(session?.user as any)?.assignedStore;
  const isManager = (session?.user as any)?.role === "manager";

  const navItems = [
    {
      href: base,
      label: "Venta",
      icon: <MdPointOfSale size={20} />,
      exact: true,
      managerOnly: false,
    },
    {
      href: `${base}/caja`,
      label: "Caja",
      icon: <MdAccountBalance size={20} />,
      managerOnly: false,
    },
    {
      href: `${base}/reporte`,
      label: "Reporte del Día",
      icon: <FiBarChart size={20} />,
      managerOnly: false,
    },

    {
      href: `${base}/inventario`,
      label: "Inventario",
      icon: <MdInventory2 size={20} />,
      managerOnly: false,
    },
    {
      href: `${base}/cardex`,
      label: "Cardex",
      icon: <MdTableChart size={20} />,
      managerOnly: false,
    },
    {
      href: `${base}/conteo-inventario`,
      label: "Conteo de Inventario",
      icon: <MdFactCheck size={20} />,
      managerOnly: false,
    },
    {
      href: `${base}/ordenes-trabajo`,
      label: "Órdenes de Trabajo",
      icon: <MdAssignment size={20} />,
      managerOnly: false,
    },
  ].filter((item) => !item.managerOnly || isManager);

  return (
    <aside className="h-screen print:hidden sticky top-0">
      <nav className="min-h-full flex flex-col justify-between bg-background border-r border-muted shadow-sm">
        <div>
          {/* Toggle + Logo */}
          <div
            className={`ml-2 py-3 flex items-center ${
              expanded ? "justify-between" : "justify-center"
            }`}
          >
            <Image
              alt="logo"
              src="/logos/Super-Collectibles-Menu-logo.png"
              width={140}
              height={40}
              className={`overflow-hidden transition-all ease-in-out ${
                expanded ? "w-28 h-auto" : "w-0 h-0"
              }`}
            />
            <button
              onClick={() => setExpanded((s) => !s)}
              className="p-1.5 text-foreground"
            >
              {expanded ? (
                <BsChevronBarLeft size={20} />
              ) : (
                <BsChevronBarRight size={20} />
              )}
            </button>
          </div>

          {/* Store name badge */}
          {expanded && (
            <div className="mx-3 mb-3 px-3 py-1.5 bg-primary/10 rounded-lg">
              <p className="text-xs font-semibold text-primary truncate">
                {storeName}
              </p>
            </div>
          )}

          {/* Nav items */}
          <ul className="flex flex-col gap-2 px-2 mt-1">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center rounded-[20px] text-sm transition-colors  ${
                      expanded
                        ? "px-3 py-2.5 gap-3"
                        : "px-3 py-3 justify-center"
                    } ${
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {expanded && (
                      <span
                        className={`overflow-hidden transition-all ${
                          expanded
                            ? "w-40 opacity-100"
                            : "w-0 opacity-0 py-1 text-center"
                        }`}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer: theme toggle + back + logout */}
        <div className="px-2 pb-4 flex flex-col gap-1">
          {/* Dark / light toggle */}
          <button
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            title={resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {resolvedTheme === "dark" ? (
              <MdLightMode size={20} />
            ) : (
              <MdDarkMode size={20} />
            )}
            <span
              className={`overflow-hidden transition-all ${
                expanded ? "w-40 opacity-100" : "w-0 opacity-0"
              }`}
            >
              {resolvedTheme === "dark" ? "Modo claro" : "Modo oscuro"}
            </span>
          </button>
          {!hasAssignedStore && (
            <Link
              href="/puntodeventa"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <MdArrowBack size={20} />
              <span
                className={`overflow-hidden transition-all ${
                  expanded ? "w-40 opacity-100" : "w-0 opacity-0"
                }`}
              >
                Sucursales
              </span>
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/iniciar" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <FiLogOut size={20} />
            <span
              className={`overflow-hidden transition-all ${
                expanded ? "w-40 opacity-100" : "w-0 opacity-0"
              }`}
            >
              Salir
            </span>
          </button>
        </div>
      </nav>
    </aside>
  );
}

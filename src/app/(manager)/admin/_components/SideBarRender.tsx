"use client";
import React from "react";
import AdminSidebar, { SideBarItem } from "../_components/AdminSidebar";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { TbDeviceIpadDollar, TbReport, TbDatabaseImport } from "react-icons/tb";
import { PiUserListLight } from "react-icons/pi";
import { TfiDashboard } from "react-icons/tfi";
import {
  MdEvent,
  MdStorefront,
  MdAssignment,
  MdBadge,
  MdInventory,
  MdAttachMoney,
  MdFactCheck,
} from "react-icons/md";
import { FaCartPlus } from "react-icons/fa6";
import { BsCardImage } from "react-icons/bs";

const SideBarRender = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role;

  // If user is organizer, only show evento menu
  if (userRole === "organizer") {
    return (
      <AdminSidebar>
        <SideBarItem
          icon={<MdEvent size={20} />}
          text={"Eventos"}
          active={pathname === "/admin/evento" ? "true" : "false"}
          url={"/admin/evento"}
        />
      </AdminSidebar>
    );
  }

  // For manager/director/super_admin role, show menu items
  // (super_admin-only items are conditionally rendered below)
  return (
    <AdminSidebar>
      <SideBarItem
        icon={<TfiDashboard size={20} />}
        text={"Tablero"}
        active={pathname === "/admin" ? "true" : "false"}
        url={"/admin"}
      />
      <SideBarItem
        icon={<TbDeviceIpadDollar size={20} />}
        text={"Pedidos"}
        active={pathname === "/admin/pedidos" ? "true" : "false"}
        url={"/admin/pedidos"}
      />
      {/* <SideBarItem
        icon={<CiGrid31 size={20} />}
        text={"Publicaciones"}
        active={pathname === "/admin/blog" ? "true" : "false"}
        url={"/admin/blog"}
        alert
        dropdownItems={[
          {
            text: "Publicaciones",
            url: "/admin/blog",
            active: pathname === "/admin/blog" ? "true" : "false",
            icon: <CiGrid31 size={20} />,
          },
          {
            text: "Nueva",
            url: "/admin/blog/editor",
            active: pathname === "/admin/blog/editor" ? "true" : "false",
            icon: <MdOutlinePostAdd size={20} />,
          },
          // Add more dropdown items as needed
        ]}
      /> */}

      <SideBarItem
        icon={<BsCardImage size={20} />}
        text={"Productos"}
        active={
          pathname === "/admin/productos" ||
          pathname === "/admin/productos/nuevo"
            ? "true"
            : "false"
        }
        url={"/admin/productos"}
        alert
        dropdownItems={[
          {
            text: "Productos",
            url: "/admin/productos",
            active: pathname === "/admin/productos" ? "true" : "false",
            icon: <BsCardImage size={20} />,
          },
          {
            text: "Nuevo",
            url: "/admin/productos/nuevo",
            active: pathname === "/admin/productos/nuevo" ? "true" : "false",
            icon: <FaCartPlus size={20} />,
          },
          // Add more dropdown items as needed
        ]}
      />
      <SideBarItem
        icon={<PiUserListLight size={20} />}
        text={"Clientes"}
        active={pathname === "/admin/clientes" ? "true" : "false"}
        url={"/admin/clientes"}
      />
      {userRole === "super_admin" && (
        <SideBarItem
          icon={<MdEvent size={20} />}
          text={"Eventos"}
          active={pathname === "/admin/evento" ? "true" : "false"}
          url={"/admin/evento"}
        />
      )}
      <SideBarItem
        icon={<TbReport size={20} />}
        text={"Reportes"}
        active={pathname === "/admin/reportes" ? "true" : "false"}
        url={"/admin/reportes"}
      />

      {userRole === "super_admin" && (
        <SideBarItem
          icon={<TbDatabaseImport size={20} />}
          text={"Actualizar Inventario"}
          active={pathname === "/admin/productos/inventario" ? "true" : "false"}
          url={"/admin/productos/inventario"}
        />
      )}
      {userRole === "super_admin" && (
        <SideBarItem
          icon={<MdStorefront size={20} />}
          text={"Sucursales"}
          active={pathname.startsWith("/admin/sucursales") ? "true" : "false"}
          url={"/admin/sucursales"}
        />
      )}
      {userRole === "super_admin" && (
        <SideBarItem
          icon={<MdInventory size={20} />}
          text={"Inventario Inicial"}
          active={
            pathname.startsWith("/admin/inventario-inicial") ? "true" : "false"
          }
          url={"/admin/inventario-inicial"}
        />
      )}
      <SideBarItem
        icon={<MdFactCheck size={20} />}
        text={"Conteo de Inventario"}
        active={
          pathname.startsWith("/admin/inventario") &&
          !pathname.startsWith("/admin/inventario-inicial")
            ? "true"
            : "false"
        }
        url={"/admin/inventario"}
      />
      <SideBarItem
        icon={<MdBadge size={20} />}
        text={"Empleados POS"}
        active={pathname.startsWith("/admin/empleados") ? "true" : "false"}
        url={"/admin/empleados"}
      />
      <SideBarItem
        icon={<MdAssignment size={20} />}
        text={"Órdenes de Trabajo"}
        active={
          pathname.startsWith("/admin/ordenes-trabajo") ? "true" : "false"
        }
        url={"/admin/ordenes-trabajo"}
      />
      {(userRole === "manager" ||
        userRole === "director" ||
        userRole === "super_admin") && (
        <SideBarItem
          icon={<MdAttachMoney size={20} />}
          text={"Finanzas"}
          active={pathname.startsWith("/admin/finanzas") ? "true" : "false"}
          url={"/admin/finanzas"}
        />
      )}
    </AdminSidebar>
  );
};

export default SideBarRender;

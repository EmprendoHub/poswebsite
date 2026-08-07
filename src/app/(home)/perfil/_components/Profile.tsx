"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { formatDate, formatTime } from "@/backend/helpers";
import { useSession } from "next-auth/react";
import {
  MdPhone,
  MdEmail,
  MdCalendarToday,
  MdStar,
  MdShoppingCart,
  MdLocationOn,
  MdVerifiedUser,
} from "react-icons/md";

const Profile = () => {
  const session: any = useSession();
  const user = session?.data?.user;
  const [stats, setStats] = useState<any>({
    ordersCount: 0,
    favoritesCount: 0,
    points: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;

    async function fetchStats() {
      try {
        const res = await fetch(`/api/customer-dashboard?userId=${user._id}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [user?._id]);

  return (
    <div className="p-6 max-w-6xl pl-20">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-6 mb-8 border border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {user?.image ? (
              <Image
                className="w-24 h-24 rounded-full ring-4 ring-primary/30"
                src={user?.image}
                alt={user?.name}
                width={96}
                height={96}
              />
            ) : (
              <div className="w-24 h-24 rounded-full ring-4 ring-primary/30 bg-primary text-white flex items-center justify-center text-3xl font-bold">
                {user?.name?.substring(0, 1)}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{user?.name}</h1>
              {user?.role !== "cliente" && (
                <span className="flex items-center gap-1 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                  <MdVerifiedUser size={16} />
                  {user?.role}
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-foreground/80">
                <MdEmail size={16} className="flex-shrink-0" />
                <span>{user?.email}</span>
              </div>
              {user?.phone && (
                <div className="flex items-center gap-2 text-foreground/80">
                  <MdPhone size={16} className="flex-shrink-0" />
                  <span>{user?.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-foreground/80">
                <MdCalendarToday size={16} className="flex-shrink-0" />
                <span>
                  Miembro desde{" "}
                  {user?.createdAt &&
                    formatDate(user?.createdAt.substring(0, 24))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Orders */}
        <div className="bg-background border border-muted rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Órdenes
            </span>
            <MdShoppingCart className="text-primary" size={20} />
          </div>
          <p className="text-3xl font-bold">{stats.ordersCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            compras realizadas
          </p>
        </div>

        {/* Favorites */}
        <div className="bg-background border border-muted rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Favoritos
            </span>
            <MdStar className="text-yellow-500" size={20} />
          </div>
          <p className="text-3xl font-bold">{stats.favoritesCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            productos guardados
          </p>
        </div>

        {/* Points */}
        {/* <div className="bg-background border border-muted rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Puntos
            </span>
            <span className="text-2xl">⭐</span>
          </div>
          <p className="text-3xl font-bold">{user?.points || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            puntos acumulados
          </p>
        </div> */}

        {/* Status */}
        <div className="bg-background border border-muted rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Estado
            </span>
            <div
              className={`w-3 h-3 rounded-full ${
                user?.accessToken ? "bg-green-500" : "bg-muted"
              }`}
            ></div>
          </div>
          <p className="text-sm font-semibold">
            {user?.accessToken?.length > 0 ? "Activo" : "Inactivo"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {user?.accessToken?.length > 0
              ? "Cuenta activa"
              : "Cuenta desactivada"}
          </p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-background border border-muted rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Información de la cuenta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Rol
            </p>
            <p className="text-base font-semibold capitalize">{user?.role}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Creada
            </p>
            <p className="text-base font-semibold">
              {user?.createdAt && formatDate(user?.createdAt.substring(0, 24))}{" "}
              a las{" "}
              {user?.createdAt && formatTime(user?.createdAt.substring(0, 24))}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Última actualización
            </p>
            <p className="text-base font-semibold">
              {user?.updatedAt && formatDate(user?.updatedAt.substring(0, 24))}{" "}
              a las{" "}
              {user?.updatedAt && formatTime(user?.updatedAt.substring(0, 24))}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Contacto
            </p>
            <p className="text-base font-semibold">
              {user?.phone || "No proporcionado"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

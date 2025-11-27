"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";
import {
  Users,
  Shield,
  Truck,
  Building2,
  ArrowLeft,
  Loader2,
  RefreshCcw,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "ADMIN" | "SUPPLIER" | "BUSINESS" | null;
  createdAt: string;
  _count: {
    uploadedInvoices: number;
    receivedInvoices: number;
    payments: number;
  };
}

interface AdminDashboardProps {
  session: Session;
}

export function AdminDashboard({ session }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRole = async (userId: string, role: string) => {
    setUpdatingUserId(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: role as User["role"] } : u
          )
        );
      }
    } catch (error) {
      console.error("Error updating user role:", error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "ADMIN").length,
    suppliers: users.filter((u) => u.role === "SUPPLIER").length,
    businesses: users.filter((u) => u.role === "BUSINESS").length,
    noRole: users.filter((u) => !u.role).length,
  };

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="h-4 w-4 text-purple-500" />;
      case "SUPPLIER":
        return <Truck className="h-4 w-4 text-blue-500" />;
      case "BUSINESS":
        return <Building2 className="h-4 w-4 text-emerald-500" />;
      default:
        return <Users className="h-4 w-4 text-slate-400" />;
    }
  };

  const getRoleBadgeClass = (role: string | null) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "SUPPLIER":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "BUSINESS":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                Admin Dashboard
              </h1>
              <p className="text-xs text-slate-500">Manage users and roles</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            )}
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">
                {session.user.name}
              </p>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-purple-500" />
                <span className="text-xs text-purple-600 font-medium">Admin</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Total Users
              </CardTitle>
              <Users className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Admins
              </CardTitle>
              <Shield className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{stats.admins}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Suppliers
              </CardTitle>
              <Truck className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats.suppliers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Businesses
              </CardTitle>
              <Building2 className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-600">{stats.businesses}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                No Role
              </CardTitle>
              <Users className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-600">{stats.noRole}</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All Users</h2>
          <Button variant="outline" onClick={fetchUsers} size="icon">
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Users Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Current Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Activity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Set Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt=""
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200">
                            <Users className="h-5 w-5 text-slate-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">
                            {user.name || "No name"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                          user.role
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {user.role || "None"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 space-y-1">
                        <p>{user._count.uploadedInvoices} invoices uploaded</p>
                        <p>{user._count.receivedInvoices} invoices received</p>
                        <p>{user._count.payments} payments made</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {["ADMIN", "SUPPLIER", "BUSINESS"].map((role) => (
                          <button
                            key={role}
                            onClick={() => updateUserRole(user.id, role)}
                            disabled={updatingUserId === user.id || user.role === role}
                            className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                              user.role === role
                                ? role === "ADMIN"
                                  ? "bg-purple-500 text-white"
                                  : role === "SUPPLIER"
                                  ? "bg-blue-500 text-white"
                                  : "bg-emerald-500 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            } ${
                              updatingUserId === user.id
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          >
                            {updatingUserId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : user.role === role ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              role.charAt(0) + role.slice(1).toLowerCase()
                            )}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}


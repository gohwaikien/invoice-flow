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
  Plus,
  Link as LinkIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "ADMIN" | "SUPPLIER" | "BUSINESS" | null;
  companyId: string | null;
  createdAt: string;
  _count: {
    uploadedInvoices: number;
    receivedInvoices: number;
    payments: number;
  };
}

interface Company {
  id: string;
  name: string;
  type: "SUPPLIER" | "BUSINESS";
  users: { id: string; name: string | null; email: string | null; role: string | null }[];
  _count: {
    users: number;
    payments: number;
    invoices: number;
  };
  supplierAccess: { id: string; businessCompany: { id: string; name: string } }[];
  businessAccess: { id: string; supplierCompany: { id: string; name: string } }[];
}

interface AdminDashboardProps {
  session: Session;
}

export function AdminDashboard({ session }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"users" | "companies">("companies");
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  
  // New company form
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyType, setNewCompanyType] = useState<"SUPPLIER" | "BUSINESS">("SUPPLIER");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  
  // Add user to company
  const [addingUserToCompanyId, setAddingUserToCompanyId] = useState<string | null>(null);
  const [userEmailToAdd, setUserEmailToAdd] = useState("");
  
  // Grant access
  const [grantingAccessToCompanyId, setGrantingAccessToCompanyId] = useState<string | null>(null);
  const [selectedAccessCompanyId, setSelectedAccessCompanyId] = useState("");

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/admin/companies");
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  // Setup state
  const [setupStatus, setSetupStatus] = useState<{
    needsSetup: boolean;
    unassignedPayments: number;
    unassignedInvoices: number;
  } | null>(null);
  const [isRunningSetup, setIsRunningSetup] = useState(false);
  const [setupResult, setSetupResult] = useState<{ success: boolean; logs: string[] } | null>(null);

  const fetchSetupStatus = async () => {
    try {
      const response = await fetch("/api/admin/setup-companies");
      if (response.ok) {
        const data = await response.json();
        setSetupStatus(data);
      }
    } catch (error) {
      console.error("Error fetching setup status:", error);
    }
  };

  const runSetup = async () => {
    setIsRunningSetup(true);
    setSetupResult(null);
    try {
      const response = await fetch("/api/admin/setup-companies", {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        setSetupResult({ success: true, logs: data.logs });
        fetchAll();
        fetchSetupStatus();
      } else {
        setSetupResult({ success: false, logs: [data.error || "Setup failed"] });
      }
    } catch (error) {
      console.error("Error running setup:", error);
      setSetupResult({ success: false, logs: ["Failed to run setup"] });
    } finally {
      setIsRunningSetup(false);
    }
  };

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchUsers(), fetchCompanies(), fetchSetupStatus()]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const createCompany = async () => {
    if (!newCompanyName.trim()) return;
    setIsCreatingCompany(true);
    try {
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCompanyName, type: newCompanyType }),
      });
      if (response.ok) {
        setNewCompanyName("");
        setShowNewCompanyForm(false);
        fetchCompanies();
      }
    } catch (error) {
      console.error("Error creating company:", error);
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const addUserToCompany = async (companyId: string, email: string) => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        setAddingUserToCompanyId(null);
        setUserEmailToAdd("");
        fetchAll();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add user");
      }
    } catch (error) {
      console.error("Error adding user to company:", error);
    }
  };

  const removeUserFromCompany = async (companyId: string, userId: string) => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/users?userId=${userId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchAll();
      }
    } catch (error) {
      console.error("Error removing user from company:", error);
    }
  };

  const grantAccess = async (companyId: string, company: Company) => {
    if (!selectedAccessCompanyId) return;
    try {
      const body = company.type === "BUSINESS"
        ? { supplierCompanyId: selectedAccessCompanyId }
        : { businessCompanyId: selectedAccessCompanyId };
      
      const response = await fetch(`/api/admin/companies/${companyId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setGrantingAccessToCompanyId(null);
        setSelectedAccessCompanyId("");
        fetchCompanies();
      }
    } catch (error) {
      console.error("Error granting access:", error);
    }
  };

  const revokeAccess = async (companyId: string, accessId: string) => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/access?accessId=${accessId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCompanies();
      }
    } catch (error) {
      console.error("Error revoking access:", error);
    }
  };

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
        {/* Tabs */}
        <div className="mb-6 flex items-center gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("companies")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "companies"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Building2 className="inline h-4 w-4 mr-2" />
            Companies
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            Users
          </button>
          <div className="flex-1" />
          <Button variant="outline" onClick={fetchAll} size="icon" className="mb-2">
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Companies Tab */}
        {activeTab === "companies" && (
          <div className="space-y-6">
            {/* Setup Banner */}
            {setupStatus?.needsSetup && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-amber-800">Initial Setup Required</h3>
                      <p className="text-sm text-amber-700 mt-1">
                        {setupStatus.unassignedPayments > 0 && `${setupStatus.unassignedPayments} payments `}
                        {setupStatus.unassignedPayments > 0 && setupStatus.unassignedInvoices > 0 && "and "}
                        {setupStatus.unassignedInvoices > 0 && `${setupStatus.unassignedInvoices} invoices `}
                        need to be assigned to a company.
                      </p>
                    </div>
                    <Button 
                      onClick={runSetup} 
                      disabled={isRunningSetup}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {isRunningSetup ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running Setup...
                        </>
                      ) : (
                        "Run Setup"
                      )}
                    </Button>
                  </div>
                  {setupResult && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${setupResult.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {setupResult.logs.map((log, i) => (
                        <p key={i}>{log}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Create Company Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Companies ({companies.length})
              </h2>
              <Button onClick={() => setShowNewCompanyForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Company
              </Button>
            </div>

            {/* New Company Form */}
            {showNewCompanyForm && (
              <Card className="border-purple-200 bg-purple-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Company Name
                      </label>
                      <Input
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        placeholder="e.g., Global Goods Trading Solution"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">
                        Type
                      </label>
                      <select
                        value={newCompanyType}
                        onChange={(e) => setNewCompanyType(e.target.value as "SUPPLIER" | "BUSINESS")}
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="SUPPLIER">Supplier</option>
                        <option value="BUSINESS">Business</option>
                      </select>
                    </div>
                    <Button onClick={createCompany} disabled={isCreatingCompany}>
                      {isCreatingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNewCompanyForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Companies List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            ) : (
              <div className="grid gap-4">
                {companies.map((company) => (
                  <Card key={company.id} className={company.type === "SUPPLIER" ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-emerald-500"}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {company.type === "SUPPLIER" ? (
                            <Truck className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Building2 className="h-5 w-5 text-emerald-500" />
                          )}
                          <div>
                            <CardTitle className="text-base">{company.name}</CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {company.type} • {company._count.users} users • {company._count.payments} payments • {company._count.invoices} invoices
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Users in Company */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-700">Team Members</h4>
                          {addingUserToCompanyId === company.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={userEmailToAdd}
                                onChange={(e) => setUserEmailToAdd(e.target.value)}
                                placeholder="user@email.com"
                                className="h-8 w-48 text-sm"
                              />
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={() => addUserToCompany(company.id, userEmailToAdd)}
                              >
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8"
                                onClick={() => {
                                  setAddingUserToCompanyId(null);
                                  setUserEmailToAdd("");
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setAddingUserToCompanyId(company.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add User
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {company.users.map((user) => (
                            <span
                              key={user.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs"
                            >
                              {user.email}
                              <button
                                onClick={() => removeUserFromCompany(company.id, user.id)}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                          {company.users.length === 0 && (
                            <span className="text-xs text-slate-400">No users assigned</span>
                          )}
                        </div>
                      </div>

                      {/* Access Permissions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-700">
                            {company.type === "BUSINESS" ? "Can Access Suppliers" : "Accessible By Businesses"}
                          </h4>
                          {grantingAccessToCompanyId === company.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedAccessCompanyId}
                                onChange={(e) => setSelectedAccessCompanyId(e.target.value)}
                                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
                              >
                                <option value="">Select company...</option>
                                {companies
                                  .filter((c) => c.type !== company.type)
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                              </select>
                              <Button
                                size="sm"
                                className="h-8"
                                onClick={() => grantAccess(company.id, company)}
                              >
                                Grant
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8"
                                onClick={() => {
                                  setGrantingAccessToCompanyId(null);
                                  setSelectedAccessCompanyId("");
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setGrantingAccessToCompanyId(company.id)}
                            >
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Grant Access
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {company.type === "BUSINESS"
                            ? company.businessAccess.map((access) => (
                                <span
                                  key={access.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs"
                                >
                                  <Truck className="h-3 w-3" />
                                  {access.supplierCompany.name}
                                  <button
                                    onClick={() => revokeAccess(company.id, access.id)}
                                    className="text-blue-400 hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))
                            : company.supplierAccess.map((access) => (
                                <span
                                  key={access.id}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs"
                                >
                                  <Building2 className="h-3 w-3" />
                                  {access.businessCompany.name}
                                  <button
                                    onClick={() => revokeAccess(company.id, access.id)}
                                    className="text-emerald-400 hover:text-red-500"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                          {(company.type === "BUSINESS"
                            ? company.businessAccess.length
                            : company.supplierAccess.length) === 0 && (
                            <span className="text-xs text-slate-400">No access configured</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}


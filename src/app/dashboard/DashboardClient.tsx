"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Session } from "next-auth";
import {
  FileText,
  Plus,
  LogOut,
  RefreshCcw,
  Filter,
  Loader2,
  Building2,
  Truck,
  DollarSign,
  Clock,
  CheckCircle,
  Shield,
  Code,
  ArrowUpDown,
  Calendar,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { InvoiceUpload } from "@/components/InvoiceUpload";
import { InvoiceTable, Invoice } from "@/components/InvoiceTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierPaymentsList } from "@/components/SupplierPaymentsList";
import { AddPaymentModal } from "@/components/AddPaymentModal";
import { BusinessPaymentsList } from "@/components/BusinessPaymentsList";
import { Input } from "@/components/ui/input";

interface DashboardClientProps {
  session: Session;
}

type SortField = "date" | "amount" | "recipient" | "status";
type SortOrder = "asc" | "desc";

export function DashboardClient({ session }: DashboardClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "PENDING" | "PARTIAL" | "COMPLETED">("all");
  
  // New filter states for Business view
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [recipientFilter, setRecipientFilter] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const userRole = session.user.role as "ADMIN" | "SUPPLIER" | "BUSINESS";
  
  // Admin can switch between Supplier and Business views
  const [activeView, setActiveView] = useState<"SUPPLIER" | "BUSINESS">("SUPPLIER");
  const effectiveRole = userRole === "ADMIN" ? activeView : userRole;

  const [paymentsKey, setPaymentsKey] = useState(0); // To trigger refresh
  
  // For Business view: switch between Invoices and Payments
  const [businessTab, setBusinessTab] = useState<"invoices" | "payments">("payments");

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);

      const response = await fetch(`/api/invoices?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Get unique recipient names for dropdown
  const uniqueRecipients = useMemo(() => {
    const recipients = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.recipientName) {
        recipients.add(inv.recipientName);
      }
    });
    return Array.from(recipients).sort();
  }, [invoices]);

  // Filter and sort invoices for Business view
  const filteredAndSortedInvoices = useMemo(() => {
    let result = [...invoices];

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      result = result.filter((inv) => {
        if (!inv.invoiceDate) return false;
        return new Date(inv.invoiceDate) >= fromDate;
      });
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((inv) => {
        if (!inv.invoiceDate) return true;
        return new Date(inv.invoiceDate) <= toDate;
      });
    }

    // Filter by recipient name
    if (recipientFilter) {
      result = result.filter((inv) => inv.recipientName === recipientFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          const dateA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : 0;
          const dateB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case "amount":
          comparison = a.totalAmount - b.totalAmount;
          break;
        case "recipient":
          comparison = (a.recipientName || "").localeCompare(b.recipientName || "");
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [invoices, dateFrom, dateTo, recipientFilter, sortField, sortOrder]);

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setRecipientFilter("");
    setSortField("date");
    setSortOrder("desc");
  };

  const hasActiveFilters = dateFrom || dateTo || recipientFilter;

  // Calculate stats
  const stats = {
    total: invoices.length,
    pending: invoices.filter((i) => i.status === "PENDING").length,
    partial: invoices.filter((i) => i.status === "PARTIAL").length,
    completed: invoices.filter((i) => i.status === "COMPLETED").length,
    totalAmount: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
    paidAmount: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
  };

  // Format currency with thousand separators
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                InvoiceFlow
              </h1>
              <div className="flex items-center gap-2">
                {effectiveRole === "SUPPLIER" ? (
                  <Truck className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span className="text-xs text-slate-500">
                  {userRole === "ADMIN" ? `Admin (${effectiveRole})` : userRole}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Admin View Switcher */}
            {userRole === "ADMIN" && (
              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
                <button
                  onClick={() => setActiveView("SUPPLIER")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeView === "SUPPLIER"
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">Supplier</span>
                </button>
                <button
                  onClick={() => setActiveView("BUSINESS")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeView === "BUSINESS"
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Business</span>
                </button>
              </div>
            )}
            {/* Admin Link */}
            {userRole === "ADMIN" && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            )}
            {/* API Docs Link */}
            <Link href="/api-docs">
              <Button variant="outline" size="sm" className="gap-2">
                <Code className="h-4 w-4 text-violet-500" />
                <span className="hidden sm:inline">API</span>
              </Button>
            </Link>
            {/* User info */}
            <div className="hidden items-center gap-3 sm:flex">
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
                <p className="text-xs text-slate-500">{session.user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Total Invoices
              </CardTitle>
              <FileText className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {effectiveRole === "SUPPLIER" ? "Total Receivable" : "Total Payable"}
              </CardTitle>
              <DollarSign className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                RM {formatCurrency(stats.totalAmount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {effectiveRole === "SUPPLIER" ? "Amount Received" : "Amount Paid"}
              </CardTitle>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-600">
                RM {formatCurrency(stats.paidAmount)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Pending
              </CardTitle>
              <Clock className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">
                RM {formatCurrency(stats.totalAmount - stats.paidAmount)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Supplier Payments View */}
        {effectiveRole === "SUPPLIER" && (
          <>
            <div className="mb-6 flex justify-end">
              <Button onClick={() => setShowAddPaymentModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </div>
            <SupplierPaymentsList
              key={paymentsKey}
              onRefresh={() => {
                setPaymentsKey((k) => k + 1);
                fetchInvoices();
              }}
            />
          </>
        )}

        {/* Business View - Tab Switcher */}
        {effectiveRole === "BUSINESS" && (
          <>
            {/* Tab Switcher */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                <button
                  onClick={() => setBusinessTab("payments")}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    businessTab === "payments"
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  Settle Payments
                </button>
                <button
                  onClick={() => setBusinessTab("invoices")}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    businessTab === "invoices"
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  View Invoices
                </button>
              </div>
            </div>

            {/* Payments View for Business */}
            {businessTab === "payments" && (
              <BusinessPaymentsList
                key={paymentsKey}
                onRefresh={() => {
                  setPaymentsKey((k) => k + 1);
                  fetchInvoices();
                }}
              />
            )}

            {/* Invoices View for Business */}
            {businessTab === "invoices" && (
              <>
                {/* Status Filter Bar */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-slate-400" />
                    <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                      {["all", "PENDING", "PARTIAL", "COMPLETED"].map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilter(status as typeof filter)}
                          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                            filter === status
                              ? "bg-emerald-100 text-emerald-700"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {status === "all" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchInvoices} size="icon">
                      <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters */}
                <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-end gap-4">
                    {/* Date From */}
                    <div className="flex-1 min-w-[150px]">
                      <label className="mb-1.5 block text-xs font-medium text-slate-500">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        From Date
                      </label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Date To */}
                    <div className="flex-1 min-w-[150px]">
                      <label className="mb-1.5 block text-xs font-medium text-slate-500">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        To Date
                      </label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Recipient Filter */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="mb-1.5 block text-xs font-medium text-slate-500">
                        <Search className="mr-1 inline h-3 w-3" />
                        Recipient
                      </label>
                      <select
                        value={recipientFilter}
                        onChange={(e) => setRecipientFilter(e.target.value)}
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">All Recipients</option>
                        {uniqueRecipients.map((recipient) => (
                          <option key={recipient} value={recipient}>
                            {recipient}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort */}
                    <div className="flex-1 min-w-[180px]">
                      <label className="mb-1.5 block text-xs font-medium text-slate-500">
                        <ArrowUpDown className="mr-1 inline h-3 w-3" />
                        Sort By
                      </label>
                      <div className="flex gap-1">
                        <select
                          value={sortField}
                          onChange={(e) => setSortField(e.target.value as SortField)}
                          className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="date">Date</option>
                          <option value="amount">Amount</option>
                          <option value="recipient">Recipient</option>
                          <option value="status">Status</option>
                        </select>
                        <button
                          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                          className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm hover:bg-slate-50"
                          title={sortOrder === "asc" ? "Ascending" : "Descending"}
                        >
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </button>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-9 text-slate-500 hover:text-slate-700"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Clear
                      </Button>
                    )}
                  </div>

                  {/* Filter Summary */}
                  {hasActiveFilters && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <span>Showing {filteredAndSortedInvoices.length} of {invoices.length} invoices</span>
                      {recipientFilter && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          {recipientFilter}
                        </span>
                      )}
                      {dateFrom && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          From: {dateFrom}
                        </span>
                      )}
                      {dateTo && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          To: {dateTo}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Invoice Table */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  <InvoiceTable
                    invoices={filteredAndSortedInvoices}
                    userRole={effectiveRole}
                    onRefresh={fetchInvoices}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUploadModal(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Upload Invoice
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <svg
                  className="h-5 w-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <InvoiceUpload
              onSuccess={() => {
                setShowUploadModal(false);
                fetchInvoices();
              }}
            />
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      <AddPaymentModal
        isOpen={showAddPaymentModal}
        onClose={() => setShowAddPaymentModal(false)}
        onSuccess={() => setPaymentsKey((k) => k + 1)}
      />
    </div>
  );
}


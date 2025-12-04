"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useDropzone } from "react-dropzone";
import {
  DollarSign,
  FileText,
  Upload,
  X,
  Loader2,
  Check,
  ExternalLink,
  ScanText,
  Pencil,
  Trash2,
  MoreVertical,
  Receipt,
  ChevronDown,
  ChevronUp,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Settlement {
  id: string;
  amount: number;
  date: string;
  slipUrl: string | null;
  slipName: string | null;
  notes: string | null;
  transactionId: string | null;
  settledBy: { name: string | null; email: string | null };
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
  invoiceId: string | null;
  settledAmount: number;
  settlements: Settlement[];
  invoice: {
    id: string;
    invoiceNumber: string | null;
    fileName: string;
    fileUrl: string;
    totalAmount: number;
    paidAmount: number;
    status: "PENDING" | "PARTIAL" | "COMPLETED";
    recipientName: string | null;
    settlements: Settlement[];
  } | null;
  paidBy: { name: string | null; email: string | null };
  createdAt: string;
}

interface OCRResult {
  invoiceNumber: string | null;
  invoiceDate: string | null;
  recipientName: string | null;
  totalAmount: number | null;
}

interface SupplierPaymentsListProps {
  onRefresh?: () => void;
}

export function SupplierPaymentsList({ onRefresh }: SupplierPaymentsListProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "settled">("all");
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "with" | "without">("all");
  const [recipientFilter, setRecipientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort state
  type SortField = "date" | "amount" | "status";
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/payments");
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleAttachInvoice = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowUploadModal(true);
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowEditModal(true);
  };

  const handleDelete = async (payment: Payment) => {
    if (!confirm(`Delete payment of RM ${formatCurrency(payment.amount)}?`)) {
      return;
    }

    setDeletingId(payment.id);
    try {
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete");
      }

      fetchPayments();
      onRefresh?.();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete payment");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    setSelectedPayment(null);
    fetchPayments();
    onRefresh?.();
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedPayment(null);
    fetchPayments();
    onRefresh?.();
  };

  // Get unique recipient names for filter dropdown
  const uniqueRecipients = useMemo(() => {
    const recipients = new Set<string>();
    payments.forEach((p) => {
      if (p.invoice?.recipientName) {
        recipients.add(p.invoice.recipientName);
      }
    });
    return Array.from(recipients).sort();
  }, [payments]);

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    let result = payments.filter((p) => {
      // Status filter (Pending = not fully settled, Settled = fully settled)
      const settledAmount = p.settledAmount || 0;
      const isFullySettled = settledAmount >= p.amount;
      
      if (statusFilter === "pending" && isFullySettled) return false;
      if (statusFilter === "settled" && !isFullySettled) return false;

      // Invoice filter
      if (invoiceFilter === "with" && !p.invoiceId) return false;
      if (invoiceFilter === "without" && p.invoiceId) return false;

      // Recipient filter
      if (recipientFilter) {
        const invoiceRecipient = p.invoice?.recipientName || "";
        if (invoiceRecipient.toLowerCase() !== recipientFilter.toLowerCase()) return false;
      }

      // Date filter
      if (dateFrom) {
        const paymentDate = new Date(p.date);
        const fromDate = new Date(dateFrom);
        if (paymentDate < fromDate) return false;
      }
      if (dateTo) {
        const paymentDate = new Date(p.date);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (paymentDate > toDate) return false;
      }

      // Search by invoice name/number
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const invoiceName = p.invoice?.invoiceNumber?.toLowerCase() || "";
        const invoiceFileName = p.invoice?.fileName?.toLowerCase() || "";
        const notes = p.notes?.toLowerCase() || "";
        if (!invoiceName.includes(query) && !invoiceFileName.includes(query) && !notes.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "status":
          const aSettled = (a.settledAmount || 0) >= a.amount;
          const bSettled = (b.settledAmount || 0) >= b.amount;
          const aPartial = (a.settledAmount || 0) > 0;
          const bPartial = (b.settledAmount || 0) > 0;
          const aScore = aSettled ? 2 : aPartial ? 1 : 0;
          const bScore = bSettled ? 2 : bPartial ? 1 : 0;
          comparison = aScore - bScore;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [payments, statusFilter, invoiceFilter, recipientFilter, dateFrom, dateTo, searchQuery, sortField, sortOrder]);

  // Paginate filtered payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPayments.slice(startIndex, startIndex + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, invoiceFilter, dateFrom, dateTo, searchQuery, pageSize]);

  const clearFilters = () => {
    setStatusFilter("all");
    setInvoiceFilter("all");
    setRecipientFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  const hasActiveFilters = statusFilter !== "all" || invoiceFilter !== "all" || recipientFilter || dateFrom || dateTo || searchQuery;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {/* Row 1: Search and Page Size */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-[300px]">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "settled", label: "Settled" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === option.value
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Invoice:</span>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {[
                { value: "all", label: "All" },
                { value: "with", label: "With Invoice" },
                { value: "without", label: "No Invoice" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setInvoiceFilter(option.value as typeof invoiceFilter)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    invoiceFilter === option.value
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Filter */}
          {uniqueRecipients.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Recipient:</span>
              <select
                value={recipientFilter}
                onChange={(e) => setRecipientFilter(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">All</option>
                {uniqueRecipients.map((recipient) => (
                  <option key={recipient} value={recipient}>
                    {recipient}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Row 3: Date Range & Sort */}
        <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-4">
          <div className="flex-1 min-w-[140px] max-w-[180px]">
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
          <div className="flex-1 min-w-[140px] max-w-[180px]">
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
          <div className="flex-1 min-w-[160px] max-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              <ArrowUpDown className="mr-1 inline h-3 w-3" />
              Sort By
            </label>
            <div className="flex gap-1">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
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
        </div>

        {/* Filter Summary */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
            <span>Showing {filteredPayments.length} of {payments.length} payments</span>
          </div>
        )}
      </div>

      {/* Payments List */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <DollarSign className="h-5 w-5 text-blue-500" />
          My Payments ({filteredPayments.length})
        </h3>

        {paginatedPayments.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">
              {hasActiveFilters ? "No payments match your filters" : "No payments found"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedPayments.map((payment) => {
              const settledAmount = payment.settledAmount || 0;
              const progressPercent = (settledAmount / payment.amount) * 100;
              const isFullySettled = settledAmount >= payment.amount;
              const hasSettlements = payment.settlements && payment.settlements.length > 0;
              const isExpanded = expandedPaymentId === payment.id;

              return (
                <div
                  key={payment.id}
                  className={`rounded-xl border ${
                    isFullySettled
                      ? "border-emerald-200 bg-emerald-50"
                      : settledAmount > 0
                      ? "border-blue-200 bg-blue-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="text-xl font-bold text-slate-900">
                            RM {formatCurrency(payment.amount)}
                          </p>
                          {isFullySettled ? (
                            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-800">
                              Fully Settled
                            </span>
                          ) : settledAmount > 0 ? (
                            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800">
                              Partially Settled
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Pending
                            </span>
                          )}
                          {payment.invoiceId ? (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Has Invoice
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                              No Invoice
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {format(new Date(payment.date), "dd MMM yyyy")}
                          {payment.invoice && (
                            <span className="ml-2 text-blue-600">
                              • {payment.invoice.invoiceNumber || payment.invoice.fileName}
                            </span>
                          )}
                        </p>
                        {payment.notes && (
                          <p className="mt-2 text-sm text-slate-700 italic">
                            "{payment.notes}"
                          </p>
                        )}

                        {/* Settlement Progress Bar (for payments with settlements) */}
                        {settledAmount > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>
                                Settled: <span className="font-semibold text-emerald-600">RM {formatCurrency(settledAmount)}</span>
                              </span>
                              <span>
                                of RM {formatCurrency(payment.amount)}
                              </span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isFullySettled ? "bg-emerald-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(payment)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(payment)}
                          disabled={deletingId === payment.id}
                          title="Delete"
                        >
                          {deletingId === payment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                        {payment.invoice ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(payment.invoice!.fileUrl, "_blank")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Invoice
                          </Button>
                        ) : (
                          <Button onClick={() => handleAttachInvoice(payment)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Attach Invoice
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expand/Collapse for Settlements */}
                    {hasSettlements && (
                      <button
                        onClick={() =>
                          setExpandedPaymentId(isExpanded ? null : payment.id)
                        }
                        className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-white/50 py-2 text-sm font-medium text-slate-600 hover:bg-white/80 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide Settlement History
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            View {payment.settlements.length} Settlement{payment.settlements.length > 1 ? "s" : ""}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Settlements List (Expanded) */}
                  {isExpanded && hasSettlements && (
                    <div className="border-t border-slate-200 bg-white/50 p-4">
                      <h4 className="mb-3 text-sm font-semibold text-slate-700">
                        Settlement History
                      </h4>
                      <div className="space-y-2">
                        {payment.settlements.map((settlement) => (
                          <div
                            key={settlement.id}
                            className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                          >
                            <div>
                              <p className="font-medium text-slate-900">
                                RM {formatCurrency(settlement.amount)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {format(new Date(settlement.date), "dd MMM yyyy")} •{" "}
                                {settlement.settledBy.name || settlement.settledBy.email}
                              </p>
                              {settlement.transactionId && (
                                <p className="mt-0.5 text-xs text-slate-400 font-mono">
                                  TX: {settlement.transactionId}
                                </p>
                              )}
                              {settlement.notes && (
                                <p className="mt-1 text-xs text-slate-600">
                                  {settlement.notes}
                                </p>
                              )}
                            </div>
                            {settlement.slipUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(settlement.slipUrl!, "_blank")}
                              >
                                <Download className="mr-1 h-4 w-4" />
                                Slip
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-sm text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredPayments.length)} of{" "}
              {filteredPayments.length} payments
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-blue-100 text-blue-700"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Invoice Modal */}
      {showUploadModal && selectedPayment && (
        <AttachInvoiceModal
          payment={selectedPayment}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedPayment(null);
          }}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Edit Payment Modal */}
      {showEditModal && selectedPayment && (
        <EditPaymentModal
          payment={selectedPayment}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPayment(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

// Sub-component for attaching invoice
function AttachInvoiceModal({
  payment,
  onClose,
  onSuccess,
}: {
  payment: Payment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [ocrResults, setOcrResults] = useState<OCRResult | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
      setError(null);
      setOcrResults(null);
      setIsOcrProcessing(true);

      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const response = await fetch("/api/ocr/preview", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setOcrResults({
            ...data,
            invoiceDate: data.invoiceDate
              ? new Date(data.invoiceDate).toISOString().split("T")[0]
              : null,
          });
        }
      } catch (err) {
        console.error("OCR failed:", err);
      } finally {
        setIsOcrProcessing(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (ocrResults?.invoiceNumber)
        formData.append("invoiceNumber", ocrResults.invoiceNumber);
      if (ocrResults?.invoiceDate)
        formData.append("invoiceDate", ocrResults.invoiceDate);
      if (ocrResults?.recipientName)
        formData.append("recipientName", ocrResults.recipientName);
      if (ocrResults?.totalAmount)
        formData.append("totalAmount", ocrResults.totalAmount.toString());

      const response = await fetch(
        `/api/payments/${payment.id}/attach-invoice`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to attach invoice");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Attach Invoice
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Payment: RM {formatCurrency(payment.amount)}
              {payment.notes && ` • ${payment.notes}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : file
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <input {...getInputProps()} />

            {isOcrProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600">Extracting data...</p>
              </div>
            ) : file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-emerald-600" />
                <div className="text-left">
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setOcrResults(null);
                  }}
                  className="ml-2 rounded-full p-1 hover:bg-slate-200"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-2 font-medium text-slate-700">
                  Drop invoice file or click to browse
                </p>
                <p className="text-xs text-slate-500">PDF or images up to 10MB</p>
              </div>
            )}
          </div>

          {/* OCR Results */}
          {ocrResults && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ScanText className="h-4 w-4" /> Extracted Details (Editable)
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-500">Invoice #</label>
                  <input
                    type="text"
                    value={ocrResults.invoiceNumber || ""}
                    onChange={(e) =>
                      setOcrResults((p) => ({
                        ...p!,
                        invoiceNumber: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Date</label>
                  <input
                    type="date"
                    value={ocrResults.invoiceDate || ""}
                    onChange={(e) =>
                      setOcrResults((p) => ({
                        ...p!,
                        invoiceDate: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Recipient</label>
                  <input
                    type="text"
                    value={ocrResults.recipientName || ""}
                    onChange={(e) =>
                      setOcrResults((p) => ({
                        ...p!,
                        recipientName: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    placeholder="Company Name"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Total (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ocrResults.totalAmount || ""}
                    onChange={(e) =>
                      setOcrResults((p) => ({
                        ...p!,
                        totalAmount: parseFloat(e.target.value) || null,
                      }))
                    }
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || isUploading || isOcrProcessing}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Attach Invoice
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Payment Modal
function EditPaymentModal({
  payment,
  onClose,
  onSuccess,
}: {
  payment: Payment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(payment.amount.toString());
  const [notes, setNotes] = useState(payment.notes || "");
  const [date, setDate] = useState(
    new Date(payment.date).toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount.replace(/,/g, ""));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          notes: notes.trim() || null,
          date,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update payment");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2">
              <Pencil className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Edit Payment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-amount"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Amount (RM) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                RM
              </span>
              <input
                id="edit-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-12 pr-4 text-right text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-date"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Payment Date
            </label>
            <input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="edit-notes"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Note
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Payment for office supplies..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


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
  ChevronDown,
  ChevronUp,
  Download,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  Search,
  Pencil,
  Trash2,
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
  } | null;
  paidBy: { name: string | null; email: string | null };
  createdAt: string;
}

interface OCRSlipResult {
  amount: number | null;
  date: string | null;
  transactionId: string | null;
}

interface BusinessPaymentsListProps {
  onRefresh?: () => void;
}

export function BusinessPaymentsList({ onRefresh }: BusinessPaymentsListProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [settlingPayment, setSettlingPayment] = useState<Payment | null>(null);
  const [editingSettlement, setEditingSettlement] = useState<{ settlement: Settlement; payment: Payment } | null>(null);
  const [deletingSettlementId, setDeletingSettlementId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "settled">("all");
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "with" | "without">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort state
  type SortField = "date" | "amount" | "status";
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all payments (we'll show all suppliers' payments to business)
      const response = await fetch("/api/payments/all");
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

  const handleSettlePayment = (payment: Payment) => {
    setSettlingPayment(payment);
  };

  const handleSettleSuccess = () => {
    setSettlingPayment(null);
    fetchPayments();
    onRefresh?.();
  };

  const handleEditSuccess = () => {
    setEditingSettlement(null);
    fetchPayments();
    onRefresh?.();
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm("Are you sure you want to delete this settlement?")) return;
    
    setDeletingSettlementId(settlementId);
    try {
      const response = await fetch(`/api/settlements/${settlementId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        fetchPayments();
        onRefresh?.();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete settlement");
      }
    } catch (error) {
      console.error("Error deleting settlement:", error);
      alert("Failed to delete settlement");
    } finally {
      setDeletingSettlementId(null);
    }
  };

  // Get unique supplier names for filter dropdown
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
      const isFullySettled = p.settledAmount >= p.amount;
      if (statusFilter === "pending" && isFullySettled) return false;
      if (statusFilter === "settled" && !isFullySettled) return false;

      // Invoice filter
      if (invoiceFilter === "with" && !p.invoiceId) return false;
      if (invoiceFilter === "without" && p.invoiceId) return false;

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

      // Recipient filter (based on invoice recipient)
      if (recipientFilter) {
        const invoiceRecipient = p.invoice?.recipientName || "";
        if (invoiceRecipient.toLowerCase() !== recipientFilter.toLowerCase()) return false;
      }

      // Search query
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
          const aSettled = a.settledAmount >= a.amount;
          const bSettled = b.settledAmount >= b.amount;
          const aPartial = a.settledAmount > 0;
          const bPartial = b.settledAmount > 0;
          const aScore = aSettled ? 2 : aPartial ? 1 : 0;
          const bScore = bSettled ? 2 : bPartial ? 1 : 0;
          comparison = aScore - bScore;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [payments, statusFilter, invoiceFilter, dateFrom, dateTo, recipientFilter, searchQuery, sortField, sortOrder]);

  // Paginate filtered payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPayments.slice(startIndex, startIndex + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, invoiceFilter, dateFrom, dateTo, recipientFilter, searchQuery, pageSize]);

  const clearFilters = () => {
    setStatusFilter("all");
    setInvoiceFilter("all");
    setDateFrom("");
    setDateTo("");
    setRecipientFilter("");
    setSearchQuery("");
  };

  const hasActiveFilters = statusFilter !== "all" || invoiceFilter !== "all" || dateFrom || dateTo || recipientFilter || searchQuery;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
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
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-emerald-500 focus:outline-none"
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
                      ? "bg-white text-emerald-700 shadow-sm"
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
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Recipient:</span>
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All</option>
              {uniqueRecipients.map((recipient) => (
                <option key={recipient} value={recipient}>
                  {recipient}
                </option>
              ))}
            </select>
          </div>
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
                className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-emerald-500 focus:outline-none"
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
          <DollarSign className="h-5 w-5 text-amber-500" />
          Payments ({filteredPayments.length})
        </h3>

        {paginatedPayments.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <Check className="mx-auto h-12 w-12 text-emerald-400" />
            <p className="mt-4 text-slate-500">
              {hasActiveFilters ? "No payments match your filters" : "No payments found"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedPayments.map((payment) => {
              const remaining = payment.amount - payment.settledAmount;
              const progressPercent = (payment.settledAmount / payment.amount) * 100;
              const hasSettlements = payment.settlements && payment.settlements.length > 0;
              const isExpanded = expandedPaymentId === payment.id;
              const isFullySettled = payment.settledAmount >= payment.amount;

              return (
                <div
                  key={payment.id}
                  className={`rounded-xl border ${
                    isFullySettled
                      ? "border-emerald-200 bg-emerald-50"
                      : payment.settledAmount > 0
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
                          ) : payment.settledAmount > 0 ? (
                            <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800">
                              Partially Settled
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Pending Settlement
                            </span>
                          )}
                          {!payment.invoiceId && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                              No Invoice
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {format(new Date(payment.date), "dd MMM yyyy")}
                          {payment.paidBy.name && (
                            <span className="ml-2">• From: {payment.paidBy.name}</span>
                          )}
                        </p>
                        {payment.notes && (
                          <p className="mt-2 text-sm text-slate-700 italic">
                            "{payment.notes}"
                          </p>
                        )}
                        {payment.invoice && (
                          <p className="mt-1 text-sm text-blue-600">
                            Invoice: {payment.invoice.invoiceNumber || payment.invoice.fileName}
                          </p>
                        )}

                        {/* Settlement Progress */}
                        {payment.settledAmount > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>
                                Settled: <span className="font-semibold text-emerald-600">RM {formatCurrency(payment.settledAmount)}</span>
                              </span>
                              <span>
                                Remaining: <span className="font-semibold text-amber-600">RM {formatCurrency(remaining)}</span>
                              </span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-blue-500 transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        {payment.invoice?.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(payment.invoice!.fileUrl, "_blank")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Invoice
                          </Button>
                        )}
                        {isFullySettled ? (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <Check className="h-5 w-5" />
                            <span className="text-sm font-medium">Settled</span>
                          </div>
                        ) : (
                          <Button onClick={() => handleSettlePayment(payment)}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Settle
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
                                <p className="mt-0.5 text-xs text-slate-500 italic">
                                  {settlement.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSettlement({ settlement, payment })}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSettlement(settlement.id)}
                                disabled={deletingSettlementId === settlement.id}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                {deletingSettlementId === settlement.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
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
                          ? "bg-emerald-100 text-emerald-700"
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

      {/* Settle Payment Modal */}
      {settlingPayment && (
        <SettlePaymentModal
          payment={settlingPayment}
          onClose={() => setSettlingPayment(null)}
          onSuccess={handleSettleSuccess}
        />
      )}

      {/* Edit Settlement Modal */}
      {editingSettlement && (
        <EditSettlementModal
          settlement={editingSettlement.settlement}
          payment={editingSettlement.payment}
          onClose={() => setEditingSettlement(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

// Modal for settling a payment
function SettlePaymentModal({
  payment,
  onClose,
  onSuccess,
}: {
  payment: Payment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState((payment.amount - payment.settledAmount).toFixed(2));
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const remaining = payment.amount - payment.settledAmount;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
      setError(null);
      setIsOcrProcessing(true);

      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const response = await fetch("/api/ocr/slip", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data: OCRSlipResult = await response.json();
          if (data.amount) setAmount(data.amount.toFixed(2));
          if (data.date) setDate(data.date);
          if (data.transactionId) setTransactionId(data.transactionId);
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
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // Use a small epsilon for floating-point comparison to avoid precision issues
    const epsilon = 0.001;
    if (numAmount > remaining + epsilon) {
      setError(`Amount cannot exceed remaining balance of RM ${formatCurrency(remaining)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("amount", numAmount.toString());
      formData.append("date", date);
      if (notes) formData.append("notes", notes);
      if (transactionId) formData.append("transactionId", transactionId);
      if (file) formData.append("slip", file);

      const response = await fetch(`/api/payments/${payment.id}/settlements`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "Failed to create settlement");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settlement failed");
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
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Settle Payment
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Payment: RM {formatCurrency(payment.amount)}
              {payment.settledAmount > 0 && (
                <span className="ml-2">
                  (Remaining: RM {formatCurrency(remaining)})
                </span>
              )}
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
          {/* Payment Slip Upload */}
          <div
            {...getRootProps()}
            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all ${
              isDragActive
                ? "border-emerald-500 bg-emerald-50"
                : file
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <input {...getInputProps()} />

            {isOcrProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <p className="text-sm text-slate-600">Reading slip...</p>
              </div>
            ) : file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-6 w-6 text-emerald-600" />
                <span className="text-sm text-slate-700">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="rounded-full p-1 hover:bg-slate-200"
                >
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-1 text-sm text-slate-600">
                  Drop payment slip (optional)
                </p>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Settlement Amount (RM) *
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-right text-lg font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Settlement Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Transaction ID */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Transaction ID
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Auto-detected from slip or enter manually"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
            <Button
              type="submit"
              disabled={isSubmitting || isOcrProcessing}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Settle RM {parseFloat(amount || "0").toLocaleString()}
              </>
            )}
          </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal for editing a settlement
function EditSettlementModal({
  settlement,
  payment,
  onClose,
  onSuccess,
}: {
  settlement: Settlement;
  payment: Payment;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(settlement.amount.toFixed(2));
  const [date, setDate] = useState(new Date(settlement.date).toISOString().split("T")[0]);
  const [notes, setNotes] = useState(settlement.notes || "");
  const [transactionId, setTransactionId] = useState(settlement.transactionId || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate max allowed amount (remaining + current settlement amount)
  const otherSettlementsTotal = payment.settlements
    .filter((s) => s.id !== settlement.id)
    .reduce((sum, s) => sum + s.amount, 0);
  const maxAllowedAmount = payment.amount - otherSettlementsTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // Use epsilon for floating-point comparison
    const epsilon = 0.001;
    if (numAmount > maxAllowedAmount + epsilon) {
      setError(`Amount cannot exceed RM ${formatCurrency(maxAllowedAmount)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/settlements/${settlement.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: numAmount,
          date,
          notes: notes || null,
          transactionId: transactionId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "Failed to update settlement");
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
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Edit Settlement
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Payment: RM {formatCurrency(payment.amount)}
              <span className="ml-2">
                (Max for this settlement: RM {formatCurrency(maxAllowedAmount)})
              </span>
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
          {/* Current Slip Info */}
          {settlement.slipUrl && (
            <div className="rounded-lg bg-slate-50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-600">{settlement.slipName || "Payment slip"}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(settlement.slipUrl!, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Settlement Amount (RM) *
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-right text-lg font-semibold focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Settlement Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Transaction ID */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Transaction ID
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter transaction ID"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 font-mono text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


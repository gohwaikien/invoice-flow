"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X, FileText, ExternalLink, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Invoice } from "./InvoiceTable";

interface InvoiceDetailModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  userRole: "ADMIN" | "SUPPLIER" | "BUSINESS";
}

export function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  onRefresh,
  userRole,
}: InvoiceDetailModalProps) {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [deletingSettlementId, setDeletingSettlementId] = useState<string | null>(null);

  const viewFile = (fileUrl: string) => {
    // If it's already a full URL (GCS), open directly
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } else {
      // Legacy: fetch signed URL from API
      setLoadingFile(fileUrl);
      fetch(`/api/files/${encodeURIComponent(fileUrl)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.url) {
            window.open(data.url, "_blank", "noopener,noreferrer");
          }
        })
        .catch((err) => console.error("Error getting file URL:", err))
        .finally(() => setLoadingFile(null));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
    }).format(amount);
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!confirm("Are you sure you want to delete this settlement?")) {
      return;
    }

    setDeletingSettlementId(settlementId);
    try {
      const response = await fetch(`/api/settlements/${settlementId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete settlement");
        return;
      }

      onRefresh?.();
      onClose();
    } catch (error) {
      console.error("Error deleting settlement:", error);
      alert("Failed to delete settlement");
    } finally {
      setDeletingSettlementId(null);
    }
  };

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="success">Completed</Badge>;
      case "PARTIAL":
        return <Badge variant="warning">Partial</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (!isOpen) return null;

  const progressPercent = (invoice.paidAmount / invoice.totalAmount) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-100 p-3">
              <FileText className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {invoice.invoiceNumber || "Invoice"}
              </h2>
              <p className="text-sm text-slate-500">{invoice.fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
          {/* Status & Progress */}
          <div className="mb-6 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                Payment Progress
              </span>
              {getStatusBadge(invoice.status)}
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-slate-600">
                Settled: <span className="font-medium text-emerald-600">{formatCurrency(invoice.paidAmount)}</span>
              </span>
              <span className="text-slate-600">
                Total Owed: <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
              </span>
            </div>
          </div>

          {/* OCR Extracted Data */}
          <div className="mb-6 rounded-xl border-2 border-emerald-100 bg-emerald-50/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <h4 className="text-sm font-semibold text-emerald-700">
                Extracted Invoice Data
              </h4>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
                  Recipient Name
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {invoice.recipientName || (
                    <span className="text-slate-400 text-sm font-normal">Not extracted</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
                  Invoice Date
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {invoice.invoiceDate ? (
                    format(new Date(invoice.invoiceDate), "dd MMM yyyy")
                  ) : (
                    <span className="text-slate-400 text-sm font-normal">Not extracted</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
                  Total Amount
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">
                  {formatCurrency(invoice.totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Details Grid */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Invoice Number
              </p>
              <p className="mt-1 text-slate-900">
                {invoice.invoiceNumber || "Not extracted"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Assigned Recipient
              </p>
              <p className="mt-1 text-slate-900">
                {invoice.recipient?.name || invoice.recipient?.email || "Not assigned"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Uploaded By
              </p>
              <p className="mt-1 text-slate-900">
                {invoice.uploader.name || invoice.uploader.email}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Upload Date
              </p>
              <p className="mt-1 text-slate-900">
                {format(new Date(invoice.createdAt), "dd MMMM yyyy")}
              </p>
            </div>
          </div>

          {/* View Invoice Button */}
          <Button
            variant="outline"
            onClick={() => viewFile(invoice.fileUrl)}
            disabled={loadingFile === invoice.fileUrl}
            className="mb-6 w-full"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Invoice Document
          </Button>

          {/* Supplier Payments - Only show if supplier has payments */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Supplier Payments (On Behalf)
              </h3>
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(payment.date), "MMM d, yyyy")} •{" "}
                        {payment.paidBy.name || payment.paidBy.email}
                      </p>
                      {payment.notes && (
                        <p className="mt-1 text-sm text-slate-600">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                    {payment.slipUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewFile(payment.slipUrl!)}
                        disabled={loadingFile === payment.slipUrl}
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

          {/* Business Settlements */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Settlement History
            </h3>
            {!invoice.settlements || invoice.settlements.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">
                No settlements recorded yet
              </p>
            ) : (
              <div className="space-y-3">
                {invoice.settlements.map((settlement) => (
                  <div
                    key={settlement.id}
                    className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">
                        {formatCurrency(settlement.amount)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(settlement.date), "MMM d, yyyy")} •{" "}
                        {settlement.settledBy.name || settlement.settledBy.email}
                      </p>
                      {settlement.transactionId && (
                        <p className="mt-1 text-xs text-slate-600 font-mono">
                          TX ID: {settlement.transactionId}
                        </p>
                      )}
                      {settlement.notes && (
                        <p className="mt-1 text-sm text-slate-600">
                          {settlement.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {settlement.slipUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewFile(settlement.slipUrl!)}
                          disabled={loadingFile === settlement.slipUrl}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Slip
                        </Button>
                      )}
                      {(userRole === "BUSINESS" || userRole === "ADMIN") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSettlement(settlement.id)}
                          disabled={deletingSettlementId === settlement.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingSettlementId === settlement.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}


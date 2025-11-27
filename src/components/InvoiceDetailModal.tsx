"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X, FileText, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Invoice } from "./InvoiceTable";

interface InvoiceDetailModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  userRole: "SUPPLIER" | "BUSINESS";
}

export function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  userRole,
}: InvoiceDetailModalProps) {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const viewFile = async (fileKey: string) => {
    setLoadingFile(fileKey);
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(fileKey)}`);
      const data = await response.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error getting file URL:", error);
    } finally {
      setLoadingFile(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
    }).format(amount);
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
                Paid: <span className="font-medium text-emerald-600">{formatCurrency(invoice.paidAmount)}</span>
              </span>
              <span className="text-slate-600">
                Total: <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
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

          {/* Payments */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Payment History
            </h3>
            {invoice.payments.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                No payments recorded yet
              </p>
            ) : (
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
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


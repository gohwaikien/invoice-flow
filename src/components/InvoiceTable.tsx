"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Eye, Plus, FileText, ExternalLink, Trash2, Loader2, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SettlementModal } from "./SettlementModal";
import { InvoiceDetailModal } from "./InvoiceDetailModal";

export interface Payment {
  id: string;
  amount: number;
  date: string;
  slipUrl: string | null;
  slipName: string | null;
  notes: string | null;
  paidBy: { name: string | null; email: string | null };
}

export interface Settlement {
  id: string;
  amount: number;
  date: string;
  slipUrl: string | null;
  slipName: string | null;
  notes: string | null;
  transactionId: string | null;
  settledBy: { name: string | null; email: string | null };
}

export interface Invoice {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  recipientName: string | null;
  totalAmount: number;
  paidAmount: number;
  status: "PENDING" | "PARTIAL" | "COMPLETED";
  fileUrl: string;
  fileName: string;
  uploader: { name: string | null; email: string | null };
  recipient: { name: string | null; email: string | null } | null;
  payments: Payment[];
  settlements?: Settlement[];
  createdAt: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  userRole: "ADMIN" | "SUPPLIER" | "BUSINESS";
  onRefresh: () => void;
}

export function InvoiceTable({ invoices, userRole, onRefresh }: InvoiceTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to delete invoice "${invoice.invoiceNumber || invoice.fileName}"?`)) {
      return;
    }

    setDeletingId(invoice.id);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete invoice");
        return;
      }

      onRefresh();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice");
    } finally {
      setDeletingId(null);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
    }).format(amount);
  };

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
        <FileText className="h-16 w-16 text-slate-300" />
        <h3 className="mt-4 text-lg font-medium text-slate-700">
          No invoices yet
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {userRole === "SUPPLIER"
            ? "Upload your first invoice to get started"
            : "Invoices assigned to you will appear here"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Invoice #
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Invoice Date
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                  Recipient Name
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                  Total Amount
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                  Settled
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        {invoice.invoiceNumber || "—"}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[150px]" title={invoice.fileName}>
                        {invoice.fileName}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {invoice.invoiceDate
                          ? format(new Date(invoice.invoiceDate), "dd MMM yyyy")
                          : "—"}
                      </p>
                      {!invoice.invoiceDate && (
                        <p className="text-xs text-slate-400">
                          Uploaded: {format(new Date(invoice.createdAt), "dd MMM yyyy")}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {invoice.recipientName || "—"}
                      </p>
                      {invoice.recipient && (
                        <p className="text-xs text-slate-500">
                          {invoice.recipient.email}
                        </p>
                      )}
                      {!invoice.recipientName && !invoice.recipient && (
                        <p className="text-xs text-amber-500">
                          Not extracted
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={
                        invoice.paidAmount >= invoice.totalAmount
                          ? "font-medium text-emerald-600"
                          : "text-slate-600"
                      }
                    >
                      {formatCurrency(invoice.paidAmount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(invoice.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowDetailModal(true);
                        }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(userRole === "BUSINESS" || userRole === "ADMIN") && invoice.status !== "COMPLETED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowSettlementModal(true);
                          }}
                        >
                          <Banknote className="mr-1 h-4 w-4" />
                          Settle
                        </Button>
                      )}
                      {userRole === "SUPPLIER" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(invoice)}
                          disabled={deletingId === invoice.id}
                          title="Delete Invoice"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingId === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Modal */}
      {selectedInvoice && showSettlementModal && (
        <SettlementModal
          invoice={selectedInvoice}
          isOpen={showSettlementModal}
          onClose={() => {
            setShowSettlementModal(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setShowSettlementModal(false);
            setSelectedInvoice(null);
            onRefresh();
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedInvoice && showDetailModal && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInvoice(null);
          }}
          userRole={userRole}
        />
      )}
    </>
  );
}


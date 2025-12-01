"use client";

import { useState, useCallback, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Settlement {
  id: string;
  amount: number;
  date: string;
  slipUrl: string | null;
  slipName: string | null;
  notes: string | null;
  settledBy: { name: string | null; email: string | null };
}

interface Payment {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
  invoiceId: string | null;
  invoice: {
    id: string;
    invoiceNumber: string | null;
    fileName: string;
    fileUrl: string;
    totalAmount: number;
    paidAmount: number;
    status: "PENDING" | "PARTIAL" | "COMPLETED";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const unlinkedPayments = payments.filter((p) => !p.invoiceId);
  const linkedPayments = payments.filter((p) => p.invoiceId);

  return (
    <div className="space-y-8">
      {/* Unlinked Payments */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <DollarSign className="h-5 w-5 text-amber-500" />
          Payments Awaiting Invoice ({unlinkedPayments.length})
        </h3>

        {unlinkedPayments.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-slate-500">
              No payments pending invoice attachment
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {unlinkedPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-bold text-slate-900">
                      RM {formatCurrency(payment.amount)}
                    </p>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Needs Invoice
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {format(new Date(payment.date), "dd MMM yyyy")}
                  </p>
                  {payment.notes && (
                    <p className="mt-2 text-sm text-slate-700 italic">
                      "{payment.notes}"
                    </p>
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
                  <Button onClick={() => handleAttachInvoice(payment)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Attach Invoice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked Payments */}
      {linkedPayments.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Receipt className="h-5 w-5 text-blue-500" />
            Payments with Invoice ({linkedPayments.length})
          </h3>

          <div className="space-y-3">
            {linkedPayments.map((payment) => {
              const invoice = payment.invoice!;
              const settledAmount = invoice.paidAmount;
              const totalAmount = invoice.totalAmount;
              const progressPercent = (settledAmount / totalAmount) * 100;
              const isExpanded = expandedPaymentId === payment.id;
              const hasSettlements = invoice.settlements && invoice.settlements.length > 0;

              return (
                <div
                  key={payment.id}
                  className={`rounded-xl border ${
                    invoice.status === "COMPLETED"
                      ? "border-emerald-200 bg-emerald-50"
                      : invoice.status === "PARTIAL"
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="text-xl font-bold text-slate-900">
                            RM {formatCurrency(payment.amount)}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              invoice.status === "COMPLETED"
                                ? "bg-emerald-200 text-emerald-800"
                                : invoice.status === "PARTIAL"
                                ? "bg-amber-200 text-amber-800"
                                : "bg-slate-200 text-slate-800"
                            }`}
                          >
                            {invoice.status === "COMPLETED"
                              ? "Fully Settled"
                              : invoice.status === "PARTIAL"
                              ? "Partially Settled"
                              : "Pending Settlement"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {format(new Date(payment.date), "dd MMM yyyy")}
                          <span className="ml-2">
                            • {invoice.invoiceNumber || invoice.fileName}
                          </span>
                        </p>
                        {payment.notes && (
                          <p className="mt-2 text-sm text-slate-700 italic">
                            "{payment.notes}"
                          </p>
                        )}

                        {/* Settlement Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>
                              Settled: <span className="font-semibold text-emerald-600">RM {formatCurrency(settledAmount)}</span>
                            </span>
                            <span>
                              of RM {formatCurrency(totalAmount)}
                            </span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full transition-all ${
                                invoice.status === "COMPLETED"
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                              }`}
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                        </div>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(invoice.fileUrl, "_blank");
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Invoice
                        </Button>
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
                            View {invoice.settlements.length} Settlement{invoice.settlements.length > 1 ? "s" : ""}
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
                        {invoice.settlements.map((settlement) => (
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
        </div>
      )}

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


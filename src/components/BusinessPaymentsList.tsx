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
  ChevronDown,
  ChevronUp,
  Download,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Separate payments by settlement status
  const unsettledPayments = payments.filter((p) => p.settledAmount < p.amount);
  const settledPayments = payments.filter((p) => p.settledAmount >= p.amount);

  return (
    <div className="space-y-8">
      {/* Payments Pending Settlement */}
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <DollarSign className="h-5 w-5 text-amber-500" />
          Payments Pending Settlement ({unsettledPayments.length})
        </h3>

        {unsettledPayments.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <Check className="mx-auto h-12 w-12 text-emerald-400" />
            <p className="mt-4 text-slate-500">
              All payments have been settled!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {unsettledPayments.map((payment) => {
              const remaining = payment.amount - payment.settledAmount;
              const progressPercent = (payment.settledAmount / payment.amount) * 100;
              const hasSettlements = payment.settlements && payment.settlements.length > 0;
              const isExpanded = expandedPaymentId === payment.id;

              return (
                <div
                  key={payment.id}
                  className={`rounded-xl border ${
                    payment.settledAmount > 0
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
                          {payment.settledAmount > 0 ? (
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
                        <Button onClick={() => handleSettlePayment(payment)}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Settle
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
      </div>

      {/* Fully Settled Payments */}
      {settledPayments.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Check className="h-5 w-5 text-emerald-500" />
            Fully Settled ({settledPayments.length})
          </h3>
          <div className="space-y-3">
            {settledPayments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-bold text-slate-900">
                        RM {formatCurrency(payment.amount)}
                      </p>
                      <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Settled
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {format(new Date(payment.date), "dd MMM yyyy")}
                      {payment.paidBy.name && (
                        <span className="ml-2">• From: {payment.paidBy.name}</span>
                      )}
                    </p>
                  </div>
                  <Check className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      {settlingPayment && (
        <SettlePaymentModal
          payment={settlingPayment}
          onClose={() => setSettlingPayment(null)}
          onSuccess={handleSettleSuccess}
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

    if (numAmount > remaining) {
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


"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, File, Loader2, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  fileName: string;
  totalAmount: number;
  paidAmount: number;
}

interface SlipOCRResult {
  amount: number | null;
  date: string | null;
  transactionId: string | null;
}

interface SettlementModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SettlementModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: SettlementModalProps) {
  const remaining = invoice.totalAmount - invoice.paidAmount;
  
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [slipOcrResults, setSlipOcrResults] = useState<SlipOCRResult | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      setSlip(uploadedFile);
      setError(null);
      setSlipOcrResults(null);
      setIsOcrProcessing(true);

      try {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const response = await fetch("/api/ocr/slip", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data: SlipOCRResult = await response.json();
          setSlipOcrResults(data);

          // Pre-fill amount, date, and transaction ID if OCR found them
          if (data.amount) setAmount(data.amount.toFixed(2));
          if (data.date) setDate(data.date);
          if (data.transactionId) setTransactionId(data.transactionId);
        }
      } catch (err) {
        console.error("Slip OCR failed:", err);
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
    maxSize: 5 * 1024 * 1024,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amountNum > remaining) {
      setError("Settlement exceeds remaining balance");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("amount", amount);
      formData.append("date", date);
      if (notes) formData.append("notes", notes);
      if (transactionId) formData.append("transactionId", transactionId);
      if (slip) formData.append("slip", slip);

      const response = await fetch(`/api/invoices/${invoice.id}/settlements`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          // Duplicate transaction
          throw new Error(data.message || "This transaction has already been recorded");
        }
        throw new Error(data.error || "Failed to add settlement");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add Settlement</h2>
            <p className="text-sm text-slate-500">
              Invoice: {invoice.invoiceNumber || invoice.fileName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-4">
          <div className="text-center">
            <p className="text-xs text-slate-500">Total Owed</p>
            <p className="font-semibold text-slate-900">
              RM {invoice.totalAmount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Settled</p>
            <p className="font-semibold text-emerald-600">
              RM {invoice.paidAmount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Outstanding</p>
            <p className="font-semibold text-amber-600">
              RM {remaining.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={remaining}
            label="Settlement Amount (RM)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />

          <Input
            id="date"
            type="date"
            label="Payment Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-lg border-2 border-slate-200 bg-white px-4 py-2 text-base transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-transparent"
              placeholder="Payment reference, transaction ID..."
            />
          </div>

          {/* Slip Upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Payment Slip (recommended)
            </label>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                isDragActive
                  ? "border-emerald-500 bg-emerald-50"
                  : slip
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input {...getInputProps()} />
              {isOcrProcessing ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <p className="text-sm text-slate-600">Extracting slip data...</p>
                </div>
              ) : slip ? (
                <div className="flex items-center justify-center gap-2">
                  <File className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm text-slate-700">{slip.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlip(null);
                      setSlipOcrResults(null);
                      setTransactionId("");
                    }}
                    className="rounded-full p-1 hover:bg-slate-200"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="h-6 w-6 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    Drop payment slip or click to upload
                  </p>
                </div>
              )}
            </div>
          </div>

          {slipOcrResults && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ScanText className="h-4 w-4" /> Extracted from Slip (Editable)
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-slate-500">Amount (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Transaction ID (for duplicate check)</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g., 2024123456789"
                    className="mt-1 w-full rounded border px-2 py-1 text-sm font-mono"
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
              disabled={isSubmitting || isOcrProcessing}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Add Settlement"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


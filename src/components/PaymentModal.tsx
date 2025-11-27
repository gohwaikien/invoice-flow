"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Invoice } from "./InvoiceTable";

interface PaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [amount, setAmount] = useState(
    (invoice.totalAmount - invoice.paidAmount).toFixed(2)
  );
  const [notes, setNotes] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSlip(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amountNum > invoice.totalAmount - invoice.paidAmount) {
      setError("Payment exceeds remaining balance");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("amount", amount);
      if (notes) formData.append("notes", notes);
      if (slip) formData.append("slip", slip);

      const response = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add payment");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const remaining = invoice.totalAmount - invoice.paidAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Add Payment</h2>
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
            <p className="text-xs text-slate-500">Total</p>
            <p className="font-semibold text-slate-900">
              RM {invoice.totalAmount.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Paid</p>
            <p className="font-semibold text-emerald-600">
              RM {invoice.paidAmount.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Remaining</p>
            <p className="font-semibold text-amber-600">RM {remaining.toFixed(2)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={remaining}
            label="Payment Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
              placeholder="Payment notes..."
            />
          </div>

          {/* Slip Upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Payment Slip (optional)
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
              {slip ? (
                <div className="flex items-center justify-center gap-2">
                  <File className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm text-slate-700">{slip.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSlip(null);
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
                    Drop slip or click to upload
                  </p>
                </div>
              )}
            </div>
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
                  Processing...
                </>
              ) : (
                "Add Payment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}


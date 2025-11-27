"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X, Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InvoiceUploadProps {
  onSuccess?: () => void;
}

interface ExtractedData {
  invoiceNumber: string;
  recipientName: string;
  invoiceDate: string;
  totalAmount: number;
}

export function InvoiceUpload({ onSuccess }: InvoiceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  
  // Editable fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  const runOCR = async (uploadedFile: File) => {
    setIsExtracting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);
      
      const response = await fetch("/api/ocr/preview", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("OCR extraction failed");
      }
      
      const data: ExtractedData = await response.json();
      setExtractedData(data);
      
      // Populate editable fields
      setInvoiceNumber(data.invoiceNumber || "");
      setRecipientName(data.recipientName || "");
      setInvoiceDate(data.invoiceDate || "");
      setTotalAmount(data.totalAmount ? data.totalAmount.toString() : "");
      
    } catch (err) {
      console.error("OCR error:", err);
      setError("Could not extract data. Please fill in manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
      setError(null);
      setExtractedData(null);
      
      // Run OCR automatically
      runOCR(uploadedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleClearFile = () => {
    setFile(null);
    setExtractedData(null);
    setInvoiceNumber("");
    setRecipientName("");
    setInvoiceDate("");
    setTotalAmount("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("invoiceNumber", invoiceNumber);
      formData.append("recipientName", recipientName);
      formData.append("invoiceDate", invoiceDate);
      if (totalAmount) formData.append("totalAmount", totalAmount);
      if (recipientEmail) formData.append("recipientEmail", recipientEmail);

      const response = await fetch("/api/invoices", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload invoice");
      }

      // Reset form
      handleClearFile();
      setRecipientEmail("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "RM 0.00";
    return `RM ${num.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          isDragActive
            ? "border-emerald-500 bg-emerald-50"
            : file
            ? "border-emerald-500 bg-emerald-50/50"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
        }`}
      >
        <input {...getInputProps()} />

        {isExtracting ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Sparkles className="h-12 w-12 text-emerald-500 animate-pulse" />
              <Loader2 className="absolute -right-1 -bottom-1 h-5 w-5 text-emerald-600 animate-spin" />
            </div>
            <p className="text-lg font-medium text-emerald-700">
              Extracting invoice data...
            </p>
            <p className="text-sm text-slate-500">
              Running OCR on your document
            </p>
          </div>
        ) : file ? (
          <div className="flex items-center justify-center gap-3">
            <File className="h-10 w-10 text-emerald-600" />
            <div className="text-left">
              <p className="font-medium text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearFile();
              }}
              className="ml-2 rounded-full p-1 hover:bg-slate-200"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        ) : (
          <div>
            <Upload className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-lg font-medium text-slate-700">
              {isDragActive ? "Drop your invoice here" : "Drag & drop invoice"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              or click to browse • PDF or images up to 10MB
            </p>
          </div>
        )}
      </div>

      {/* Extracted Data Fields */}
      {file && !isExtracting && (
        <div className="space-y-4">
          {extractedData && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2">
              <Check className="h-4 w-4" />
              <span>Data extracted via OCR. Review and edit if needed.</span>
            </div>
          )}
          
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="invoiceNumber"
              type="text"
              label="Invoice Number"
              placeholder="e.g. GGTS-1300"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
            <Input
              id="recipientName"
              type="text"
              label="Recipient Name"
              placeholder="e.g. PUSTAKA GEMILANG"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="invoiceDate"
              type="date"
              label="Invoice Date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
            <div>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                min="0"
                label="Total Amount (RM)"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
              {totalAmount && (
                <p className="mt-1 text-sm text-emerald-600 font-medium">
                  {formatCurrency(totalAmount)}
                </p>
              )}
            </div>
          </div>

          <Input
            id="recipientEmail"
            type="email"
            label="Recipient Email (optional)"
            placeholder="business@company.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!file || isExtracting || isUploading}
        className="w-full"
        size="lg"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Uploading Invoice...
          </>
        ) : isExtracting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Extracting Data...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-5 w-5" />
            Upload Invoice
          </>
        )}
      </Button>
    </form>
  );
}

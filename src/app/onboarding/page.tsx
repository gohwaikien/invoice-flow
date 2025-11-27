"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Truck, ArrowRight, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"SUPPLIER" | "BUSINESS" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedRole) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set role");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-2xl p-4">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-slate-900">
            Welcome to InvoiceFlow
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Choose your account type to get started
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {/* Supplier Option */}
          <button
            onClick={() => setSelectedRole("SUPPLIER")}
            className={`group relative rounded-2xl border-2 p-6 text-left transition-all ${
              selectedRole === "SUPPLIER"
                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
            }`}
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                selectedRole === "SUPPLIER"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
              }`}
            >
              <Truck className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">
              Supplier
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Upload invoices, track payments, and manage your receivables from
              businesses you work with.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Upload & digitize invoices
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Track payment status
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                View payment history
              </li>
            </ul>
          </button>

          {/* Business Option */}
          <button
            onClick={() => setSelectedRole("BUSINESS")}
            className={`group relative rounded-2xl border-2 p-6 text-left transition-all ${
              selectedRole === "BUSINESS"
                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
            }`}
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl ${
                selectedRole === "BUSINESS"
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
              }`}
            >
              <Building2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">
              Business
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Receive invoices from suppliers, make payments, and keep records of
              all transactions.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                View received invoices
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Add payments with slips
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Track payment progress
              </li>
            </ul>
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
            className={`flex items-center gap-2 rounded-xl px-8 py-3.5 font-medium transition-all ${
              selectedRole
                ? "bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 hover:shadow-xl"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          This choice cannot be changed later. Contact support if you need help.
        </p>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import {
  Key,
  Copy,
  RefreshCcw,
  Trash2,
  Check,
  ArrowLeft,
  Code,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ApiDocsClient() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    fetchApiKey();
  }, []);

  const fetchApiKey = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/api-key");
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
      }
    } catch (error) {
      console.error("Error fetching API key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/user/api-key", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
        setShowKey(true);
      }
    } catch (error) {
      console.error("Error generating API key:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeApiKey = async () => {
    if (!confirm("Are you sure you want to revoke your API key? Any integrations using it will stop working.")) {
      return;
    }

    try {
      const response = await fetch("/api/user/api-key", { method: "DELETE" });
      if (response.ok) {
        setApiKey(null);
      }
    } catch (error) {
      console.error("Error revoking API key:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskApiKey = (key: string) => {
    return key.slice(0, 8) + "•".repeat(32) + key.slice(-8);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4 sm:px-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 p-2">
              <Code className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">API Documentation</h1>
              <p className="text-xs text-slate-500">Integrate with your systems</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* API Key Section */}
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <Key className="h-5 w-5 text-violet-500" />
            <h2 className="text-lg font-semibold text-slate-900">Your API Key</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : apiKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-slate-100 px-4 py-3 font-mono text-sm text-slate-800">
                  {showKey ? apiKey : maskApiKey(apiKey)}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowKey(!showKey)}
                  title={showKey ? "Hide" : "Show"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apiKey)}
                  title="Copy"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={generateApiKey} disabled={isGenerating}>
                  <RefreshCcw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                <Button variant="outline" onClick={revokeApiKey} className="text-red-600 hover:text-red-700">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke
                </Button>
              </div>
              <p className="text-sm text-amber-600">
                ⚠️ Keep your API key secret. Don't share it or commit it to version control.
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="mb-4 text-slate-600">You don't have an API key yet.</p>
              <Button onClick={generateApiKey} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Key className="mr-2 h-4 w-4" />
                )}
                Generate API Key
              </Button>
            </div>
          )}
        </section>

        {/* API Endpoints */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">Endpoints</h2>

          {/* Authentication */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Authentication</h3>
            <p className="mb-4 text-slate-600">
              Include your API key in the <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">X-API-Key</code> header:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
{`curl -X GET "${baseUrl}/api/payments" \\
  -H "X-API-Key: your_api_key_here"`}
            </pre>
          </div>

          {/* GET Payments */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-700">GET</span>
              <code className="text-slate-800">/api/payments</code>
            </div>
            <p className="mb-4 text-slate-600">List all your payments.</p>
            <h4 className="mb-2 text-sm font-medium text-slate-700">Query Parameters</h4>
            <table className="mb-4 w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium">Parameter</th>
                  <th className="pb-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code className="text-violet-600">status</code></td>
                  <td className="py-2">Filter by status: <code>unlinked</code> or <code>linked</code></td>
                </tr>
              </tbody>
            </table>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
{`curl -X GET "${baseUrl}/api/payments" \\
  -H "X-API-Key: ${apiKey || "your_api_key"}"

# Filter unlinked payments
curl -X GET "${baseUrl}/api/payments?status=unlinked" \\
  -H "X-API-Key: ${apiKey || "your_api_key"}"`}
            </pre>
          </div>

          {/* POST Payment */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">POST</span>
              <code className="text-slate-800">/api/payments</code>
            </div>
            <p className="mb-4 text-slate-600">Create a new payment.</p>
            <h4 className="mb-2 text-sm font-medium text-slate-700">Request Body</h4>
            <table className="mb-4 w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left font-medium">Field</th>
                  <th className="pb-2 text-left font-medium">Type</th>
                  <th className="pb-2 text-left font-medium">Required</th>
                  <th className="pb-2 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code className="text-violet-600">amount</code></td>
                  <td className="py-2">number</td>
                  <td className="py-2">Yes</td>
                  <td className="py-2">Payment amount in RM</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code className="text-violet-600">notes</code></td>
                  <td className="py-2">string</td>
                  <td className="py-2">No</td>
                  <td className="py-2">Description of the payment</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code className="text-violet-600">date</code></td>
                  <td className="py-2">string</td>
                  <td className="py-2">No</td>
                  <td className="py-2">Payment date (ISO format)</td>
                </tr>
              </tbody>
            </table>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
{`curl -X POST "${baseUrl}/api/payments" \\
  -H "X-API-Key: ${apiKey || "your_api_key"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1500.00,
    "notes": "Office supplies payment",
    "date": "2025-11-30"
  }'`}
            </pre>
          </div>

          {/* PUT Payment */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">PUT</span>
              <code className="text-slate-800">/api/payments/:id</code>
            </div>
            <p className="mb-4 text-slate-600">Update an existing payment.</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
{`curl -X PUT "${baseUrl}/api/payments/PAYMENT_ID" \\
  -H "X-API-Key: ${apiKey || "your_api_key"}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 2000.00,
    "notes": "Updated note"
  }'`}
            </pre>
          </div>

          {/* DELETE Payment */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">DELETE</span>
              <code className="text-slate-800">/api/payments/:id</code>
            </div>
            <p className="mb-4 text-slate-600">Delete a payment.</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
{`curl -X DELETE "${baseUrl}/api/payments/PAYMENT_ID" \\
  -H "X-API-Key: ${apiKey || "your_api_key"}"`}
            </pre>
          </div>

          {/* Response Example */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Response Format</h3>
            <p className="mb-4 text-slate-600">Successful responses return JSON:</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
{`{
  "id": "clx123...",
  "amount": 1500.00,
  "date": "2025-11-30T00:00:00.000Z",
  "notes": "Office supplies payment",
  "invoiceId": null,
  "invoice": null,
  "paidBy": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "createdAt": "2025-11-30T04:00:00.000Z"
}`}
            </pre>
            <h4 className="mt-6 mb-2 text-sm font-medium text-slate-700">Error Response</h4>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100">
{`{
  "error": "Error message here"
}`}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}



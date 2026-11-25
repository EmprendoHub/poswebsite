"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MdAdd, MdSearch, MdClose, MdEdit } from "react-icons/md";

interface Customer {
  id: string;
  email: string;
  customerName: string;
  currentCredits: number;
}

interface AdjustmentType {
  id: string;
  label: string;
  color: string;
}

const ManualCreditAdjustment = () => {
  const { data: session } = useSession();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [reason, setReason] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<string>("refund");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const adjustmentTypes: AdjustmentType[] = [
    { id: "refund", label: "Refund", color: "bg-red-500/20 text-red-400" },
    { id: "bonus", label: "Bonus", color: "bg-green-500/20 text-green-400" },
    {
      id: "correction",
      label: "Correction",
      color: "bg-blue-500/20 text-blue-400",
    },
    {
      id: "cancellation",
      label: "Cancellation",
      color: "bg-orange-500/20 text-orange-400",
    },
  ];

  useEffect(() => {
    if ((session?.user as any)?.role !== "organizador") {
      router.push("/no-autorizado");
      return;
    }

    const fetchCustomers = async () => {
      try {
        const response = await fetch("/api/supervisor/customers");
        if (!response.ok) throw new Error("Failed to fetch customers");
        const data = await response.json();
        setCustomers(data.customers || []);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setMessage({ type: "error", text: "Failed to load customers" });
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [session, router]);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.customerName.toLowerCase().includes(search.toLowerCase()) ||
      customer.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearch("");
    setAdjustmentAmount("");
    setReason("");
    setAdjustmentType("refund");
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer || !adjustmentAmount || !reason) {
      setMessage({ type: "error", text: "Please fill all fields" });
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("customerId", selectedCustomer.id);
      payload.append("adjustmentAmount", adjustmentAmount);
      payload.append("reason", reason);
      payload.append("adjustmentType", adjustmentType);

      const response = await fetch("/api/supervisor/manual-credit-adjustment", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to adjust credits");
      }

      setMessage({
        type: "success",
        text: `Credits adjusted successfully for ${selectedCustomer.customerName}`,
      });

      // Update local customer state
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? {
                ...c,
                currentCredits:
                  adjustmentType === "bonus" || adjustmentType === "refund"
                    ? c.currentCredits + parseFloat(adjustmentAmount)
                    : c.currentCredits - parseFloat(adjustmentAmount),
              }
            : c,
        ),
      );

      setShowModal(false);
      setSelectedCustomer(null);
      setAdjustmentAmount("");
      setReason("");

      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to adjust credits";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Manual Credit Adjustment
          </h2>
          <p className="text-sm text-zinc-400">
            Adjust customer credits manually with audit trail
          </p>
        </div>
      </div>

      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border p-3 text-sm ${
            message.type === "success"
              ? "border-green-500/50 bg-green-500/20 text-green-200"
              : "border-red-500/50 bg-red-500/20 text-red-200"
          }`}
        >
          {message.text}
        </motion.div>
      )}

      {selectedCustomer ? (
        // Adjustment Form
        <form
          onSubmit={handleSubmitAdjustment}
          className="space-y-4 rounded-lg border border-white/10 bg-zinc-900 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-zinc-400">Selected Customer</p>
              <p className="text-lg font-semibold text-white">
                {selectedCustomer.customerName}
              </p>
              <p className="text-sm text-zinc-500">{selectedCustomer.email}</p>
              <p className="mt-2 text-sm">
                Current Credits:{" "}
                <span className="font-bold text-green-400">
                  ${selectedCustomer.currentCredits.toFixed(2)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer(null);
                setSearch("");
              }}
              className="p-2 hover:bg-zinc-800 rounded-lg transition"
            >
              <MdClose size={24} className="text-zinc-400" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {adjustmentTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setAdjustmentType(type.id)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    adjustmentType === type.id
                      ? `${type.color} ring-2 ring-offset-2 ring-offset-zinc-900 ring-current`
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Adjustment Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
              required
            />
            {adjustmentAmount && (
              <p className="mt-2 text-sm text-zinc-400">
                New Balance:{" "}
                <span
                  className={`font-bold ${
                    adjustmentType === "bonus" || adjustmentType === "refund"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  $
                  {(
                    selectedCustomer.currentCredits +
                    (adjustmentType === "bonus" || adjustmentType === "refund"
                      ? parseFloat(adjustmentAmount)
                      : -parseFloat(adjustmentAmount))
                  ).toFixed(2)}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Reason (required)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this adjustment is being made..."
              rows={3}
              className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary resize-none"
              required
            />
            <p className="mt-1 text-xs text-zinc-500">
              This will be recorded in the audit trail for compliance purposes.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary py-2 font-semibold text-white hover:bg-primary/80 disabled:opacity-50 transition"
          >
            {submitting ? "Processing..." : "Confirm Adjustment"}
          </button>
        </form>
      ) : (
        // Customer Search
        <div className="space-y-4">
          <div className="relative">
            <MdSearch
              className="absolute left-3 top-3 text-zinc-500"
              size={20}
            />
            <input
              type="text"
              placeholder="Search customer by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 pl-10 pr-4 py-2 text-white outline-none ring-1 ring-white/10 focus:ring-primary"
            />
          </div>

          {/* Results */}
          <div className="space-y-2">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <motion.button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full text-left rounded-lg border border-white/10 bg-zinc-900 p-4 hover:border-primary/50 transition group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-white group-hover:text-primary transition">
                        {customer.customerName}
                      </p>
                      <p className="text-sm text-zinc-400">{customer.email}</p>
                      <p className="mt-2 text-sm text-green-400">
                        Current Balance: ${customer.currentCredits.toFixed(2)}
                      </p>
                    </div>
                    <MdEdit
                      size={20}
                      className="text-zinc-500 group-hover:text-primary transition"
                    />
                  </div>
                </motion.button>
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-zinc-900 p-8 text-center">
                <p className="text-zinc-400">
                  {search
                    ? "No customers found"
                    : "Search to select a customer"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualCreditAdjustment;

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Clock, Shield, Users, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/requests");
    if (res.status === 403) { router.push("/projects"); return; }
    const data = await res.json();
    setProfiles(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function act(profileId: string, action: "approve" | "reject") {
    setActing(profileId);
    const res = await fetch("/api/admin/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, action }),
    });
    if (!res.ok) { toast.error("Action failed"); setActing(null); return; }
    const label = action === "approve" ? "Approved" : "Rejected";
    toast.success(`${label}!`);
    setProfiles((prev) =>
      prev.map((p) => p.id === profileId ? { ...p, status: action === "approve" ? "approved" : "rejected" } : p)
    );
    setActing(null);
  }

  const filtered = profiles.filter((p) => filter === "all" || p.status === filter);
  const counts = {
    pending: profiles.filter((p) => p.status === "pending").length,
    approved: profiles.filter((p) => p.status === "approved").length,
    rejected: profiles.filter((p) => p.status === "rejected").length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-400">Super admin only</p>
          </div>
        </div>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{counts.pending}</p>
          <p className="text-xs text-amber-600 mt-0.5">Pending</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{counts.approved}</p>
          <p className="text-xs text-green-600 mt-0.5">Approved</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{counts.rejected}</p>
          <p className="text-xs text-red-600 mt-0.5">Rejected</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-100">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              filter === f
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {f} {f !== "all" && `(${counts[f]})`}
          </button>
        ))}
      </div>

      {/* User list */}
      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Users size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No {filter === "all" ? "" : filter} requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-sm font-semibold text-blue-700 uppercase">
                {(p.full_name || p.email)[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{p.full_name || "—"}</p>
                <p className="text-xs text-gray-400 truncate">{p.email}</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  Signed up {format(new Date(p.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.status === "pending" ? (
                  <>
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
                      <Clock size={10} /> Pending
                    </span>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 gap-1"
                      disabled={acting === p.id}
                      onClick={() => act(p.id, "approve")}
                    >
                      <Check size={12} /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                      disabled={acting === p.id}
                      onClick={() => act(p.id, "reject")}
                    >
                      <X size={12} /> Reject
                    </Button>
                  </>
                ) : p.status === "approved" ? (
                  <>
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-100 rounded px-2 py-0.5">
                      <CheckCircle2 size={10} /> Approved
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
                      disabled={acting === p.id}
                      onClick={() => act(p.id, "reject")}
                    >
                      <X size={12} /> Revoke
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5">
                      <XCircle size={10} /> Rejected
                    </span>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 gap-1"
                      disabled={acting === p.id}
                      onClick={() => act(p.id, "approve")}
                    >
                      <Check size={12} /> Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

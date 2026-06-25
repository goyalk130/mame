"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Clock, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function PendingContent() {
  const params = useSearchParams();
  const rejected = params.get("rejected") === "1";
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${rejected ? "bg-red-100" : "bg-amber-100"}`}>
          {rejected
            ? <XCircle className="text-red-600" size={28} />
            : <Clock className="text-amber-600" size={28} />
          }
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {rejected ? "Access Denied" : "Awaiting Approval"}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {rejected
            ? "Your account request was not approved. Contact the administrator if you think this is a mistake."
            : "Your account is pending administrator approval. You'll be able to access Mame once approved."
          }
        </p>
        <button
          onClick={signOut}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense>
      <PendingContent />
    </Suspense>
  );
}

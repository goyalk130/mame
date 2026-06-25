"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, KeyRound, User, CheckCircle2, ArrowLeft, Shield, ToggleLeft, ToggleRight } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  email: string;
  fullName: string;
}

const SUPER_ADMIN_EMAIL = "goyalkaran130@gmail.com";

export function AccountSettings({ userId, email, fullName }: Props) {
  const router = useRouter();
  const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // Super admin: signup toggle
  const [signupEnabled, setSignupEnabled] = useState<boolean | null>(null);
  const [togglingSignup, setTogglingSignup] = useState(false);

  // Load current signup state on mount (super admin only)
  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/auth/check-signup")
      .then((r) => r.json())
      .then((d) => setSignupEnabled(d.allowed));
  }, [isSuperAdmin]);

  async function toggleSignup() {
    if (signupEnabled === null) return;
    setTogglingSignup(true);
    const next = !signupEnabled;
    const res = await fetch("/api/admin/signup-toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    if (res.ok) {
      setSignupEnabled(next);
      toast.success(next ? "Signups enabled" : "Signups disabled");
    } else {
      toast.error("Failed to update signup setting");
    }
    setTogglingSignup(false);
  }

  // Profile
  const [name, setName] = useState(fullName);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Password strength
  const strength = (() => {
    if (!newPw) return 0;
    let s = 0;
    if (newPw.length >= 8) s++;
    if (/[A-Z]/.test(newPw)) s++;
    if (/[0-9]/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw)) s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-500"][strength];

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSavingProfile(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", userId);
    setSavingProfile(false);
    if (error) { toast.error("Failed to update profile"); return; }
    toast.success("Profile updated");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw) { toast.error("Enter your current password"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }

    setSavingPw(true);
    const supabase = createClient();

    // Verify current password by re-signing in
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPw,
    });
    if (signInErr) {
      setSavingPw(false);
      toast.error("Current password is incorrect");
      return;
    }

    // Update to new password
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (updateErr) { toast.error("Failed to update password"); return; }

    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setPwSuccess(true);
    setTimeout(() => setPwSuccess(false), 4000);
    toast.success("Password changed successfully");
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-400 mt-1">{email}</p>
      </div>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Profile</h2>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Display name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-9"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <Input value={email} disabled className="h-9 bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
          </div>
          <Button type="submit" size="sm" disabled={savingProfile} className="w-full">
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </section>

      {/* ── Password ────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>
        </div>

        {pwSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4">
            <CheckCircle2 size={15} className="text-green-600 shrink-0" />
            <p className="text-sm text-green-700 font-medium">Password changed successfully!</p>
          </div>
        )}

        <form onSubmit={changePassword} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Current password</label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                className="h-9 pr-9"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                className="h-9 pr-9"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Strength meter */}
            {newPw && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        i <= strength ? strengthColor : "bg-gray-200"
                      )}
                    />
                  ))}
                </div>
                <p className={cn("text-xs font-medium", {
                  "text-red-500": strength === 1,
                  "text-yellow-500": strength === 2,
                  "text-blue-500": strength === 3,
                  "text-green-600": strength === 4,
                })}>
                  {strengthLabel}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm new password</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                className={cn("h-9 pr-9", confirmPw && (confirmPw === newPw ? "border-green-400 focus-visible:ring-green-400" : "border-red-400 focus-visible:ring-red-400"))}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirmPw && confirmPw !== newPw && (
              <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
            )}
            {confirmPw && confirmPw === newPw && (
              <p className="text-xs text-green-600 mt-1">Passwords match ✓</p>
            )}
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={savingPw || !currentPw || !newPw || !confirmPw || newPw !== confirmPw}
            className="w-full"
          >
            {savingPw ? "Verifying & updating…" : "Change password"}
          </Button>
        </form>
      </section>

      {/* ── Super Admin Controls ── only visible to the designated admin ── */}
      {isSuperAdmin && (
        <section className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">Admin Controls</h2>
            <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Super Admin
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Public Signups</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {signupEnabled === null
                  ? "Loading…"
                  : signupEnabled
                  ? "New users can currently create accounts"
                  : "Registration is disabled — only you can sign in"}
              </p>
            </div>
            <button
              onClick={toggleSignup}
              disabled={togglingSignup || signupEnabled === null}
              className="ml-4 shrink-0 text-amber-600 hover:text-amber-700 disabled:opacity-50 transition-colors"
              title={signupEnabled ? "Disable signups" : "Enable signups"}
            >
              {signupEnabled
                ? <ToggleRight size={36} />
                : <ToggleLeft size={36} />}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

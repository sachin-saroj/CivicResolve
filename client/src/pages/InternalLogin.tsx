import { CivicMark, PillButton } from "@/components/CivicPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function InternalLogin() {
  const [, setLocation] = useLocation();
  const session = trpc.auth.me.useQuery();
  const login = trpc.auth.internalLogin.useMutation({
    onSuccess: () => {
      toast.success("Authorized staff session initiated.");
      void session.refetch();
      setLocation("/manage");
    },
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (session.data?.role === "officer" || session.data?.role === "admin") {
      setLocation("/manage");
    }
  }, [session.data, setLocation]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="min-h-screen bg-[#fafcfe] dark:bg-[#090a0d] text-[#0a0a0a] dark:text-[#f4f4f5] px-4 py-8 sm:px-6 sm:py-14 flex flex-col justify-between font-sans selection:bg-[#2563eb] selection:text-white">
      <div className="mx-auto max-w-5xl w-full">
        {/* Top Mark & Return Link */}
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <CivicMark />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#71717a] dark:text-[#a1a1aa] hover:text-[#0a0a0a] dark:hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Public Home</span>
          </Link>
        </div>

        {/* Card Container */}
        <div className="grid overflow-hidden rounded-[2.5rem] border border-[#e4e4e7] dark:border-[#20242f] bg-white dark:bg-[#12151b] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.08)] lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Hero Column: Official Editorial Dossier */}
          <section className="relative overflow-hidden bg-[#0a0a0a] p-8 sm:p-14 text-white flex flex-col justify-between">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2563eb]/20 blur-3xl pointer-events-none" />

            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-semibold text-neutral-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Restricted Departmental Triage</span>
              </div>

              <h1 className="font-editorial text-4xl sm:text-5xl font-normal text-white tracking-tight leading-tight">
                Public service with accountability.
              </h1>

              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md font-sans">
                Sign in to review departmental case queues, record inspection progress, manage assignments,
                and enforce strict resolution SLAs across metropolitan services.
              </p>

              <div className="pt-4 grid gap-3 text-xs text-neutral-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-bold text-white mb-0.5">Departmental Officers</p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Inspect assigned cases, update status logs, upload verification attachments, and resolve citizen requests.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="font-bold text-white mb-0.5">Executive Administrators</p>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Access global case triage, manage departmental catalogs, oversee SLA compliance, and view analytics.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-white/10 text-[11px] text-neutral-500">
              CivicResolve Governance Security Protocol • Encrypted Session Active
            </div>
          </section>

          {/* Right Column: Sign-in Form */}
          <section className="p-8 sm:p-14 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] dark:text-[#60a5fa] mb-1">
                Authorization Portal
              </p>
              <h2 className="font-editorial text-3xl font-bold text-[#0a0a0a] dark:text-white tracking-tight">
                Staff Authentication
              </h2>
              <p className="mt-1.5 text-xs text-[#71717a] dark:text-[#a1a1aa] leading-relaxed">
                Citizens can track and file cases freely without signing in.
              </p>

              <form onSubmit={submit} className="mt-8 space-y-5">
                <div>
                  <Label htmlFor="staff-email" className="text-xs font-bold uppercase tracking-wider text-[#3f3f46] dark:text-[#d4d4d8]">
                    Official Email
                  </Label>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-[#a1a1aa]" />
                    <Input
                      id="staff-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@civicresolve.internal"
                      className="h-12 rounded-2xl pl-11 border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#151922] text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="staff-password" className="text-xs font-bold uppercase tracking-wider text-[#3f3f46] dark:text-[#d4d4d8]">
                    Security Password
                  </Label>
                  <div className="relative mt-2">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-[#a1a1aa]" />
                    <Input
                      id="staff-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="h-12 rounded-2xl pl-11 border-[#e4e4e7] dark:border-[#20242f] bg-[#fafcfe] dark:bg-[#151922] text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {login.error ? (
                  <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    {login.error.message}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={login.isPending}
                  className="w-full rounded-full bg-[#0a0a0a] dark:bg-white text-white dark:text-black py-3.5 text-xs font-bold transition hover:bg-[#27272a] shadow-xs"
                >
                  {login.isPending ? "Authenticating Session…" : "Sign In to Staff Workspace →"}
                </button>
              </form>

              {/* Quick Fill Testing Credentials Pill Box (Development Only) */}
              {import.meta.env.DEV ? (
                <div className="mt-8 pt-6 border-t border-[#f0f2f5] dark:border-[#20242f]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717a] dark:text-[#a1a1aa] mb-2.5">
                    Demo Testing Accounts (Click to Fill)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fillCredentials("admin@civicresolve.internal", "Admin@CivicResolve2026!")}
                      className="rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-[#f4f4f6] dark:bg-[#181d26] px-3 py-1.5 text-[11px] font-semibold text-[#0a0a0a] dark:text-white hover:border-[#2563eb] transition"
                    >
                      👑 System Administrator
                    </button>
                    <button
                      type="button"
                      onClick={() => fillCredentials("officer.works@civicresolve.internal", "Officer@CivicResolve2026!")}
                      className="rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-[#f4f4f6] dark:bg-[#181d26] px-3 py-1.5 text-[11px] font-semibold text-[#0a0a0a] dark:text-white hover:border-[#2563eb] transition"
                    >
                      🏗️ Public Works Officer
                    </button>
                    <button
                      type="button"
                      onClick={() => fillCredentials("officer.water@civicresolve.internal", "Officer@CivicResolve2026!")}
                      className="rounded-xl border border-[#e4e4e7] dark:border-[#20242f] bg-[#f4f4f6] dark:bg-[#181d26] px-3 py-1.5 text-[11px] font-semibold text-[#0a0a0a] dark:text-white hover:border-[#2563eb] transition"
                    >
                      💧 Water & Sanitation Officer
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-6 text-center">
              <Link
                href="/track"
                className="text-xs font-semibold text-[#2563eb] dark:text-[#60a5fa] hover:underline"
              >
                Need to track a citizen case? Use the open tracker →
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="text-center text-xs text-[#71717a] dark:text-[#a1a1aa] py-4">
        CivicResolve Public Redress Infrastructure • Internal Operations Access
      </div>
    </div>
  );
}

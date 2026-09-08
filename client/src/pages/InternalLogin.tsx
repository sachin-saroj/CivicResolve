import { CivicMark, PageHeader } from "@/components/CivicPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function InternalLogin() {
  const [, setLocation] = useLocation();
  const session = trpc.auth.me.useQuery();
  const login = trpc.auth.internalLogin.useMutation({
    onSuccess: () => {
      toast.success("Secure staff session started.");
      void session.refetch();
      setLocation("/manage");
    },
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (session.data?.role === "officer" || session.data?.role === "admin") setLocation("/manage");
  }, [session.data, setLocation]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login.mutate({ email, password });
  };

  return <main className="min-h-screen bg-[#f5f7f8] px-5 py-8 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <div className="mb-10"><CivicMark /></div>
      <div className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(30,58,77,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative overflow-hidden bg-[#122b3a] p-8 text-white sm:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#39739e]/30 blur-3xl" />
          <div className="relative max-w-md"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#d7edf9]"><ShieldCheck className="h-3.5 w-3.5" />Internal access</div><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Keep civic work moving.</h1><p className="mt-5 text-sm leading-7 text-slate-300">Sign in to review departmental cases, record progress, manage assignments, and keep every decision auditable.</p><div className="mt-12 grid gap-3 text-xs text-slate-300"><div className="rounded-2xl border border-white/10 bg-white/5 p-4">Officers see assigned and departmental grievances.</div><div className="rounded-2xl border border-white/10 bg-white/5 p-4">Administrators can oversee the full service register.</div></div></div>
        </section>
        <section className="p-8 sm:p-12"><PageHeader eyebrow="CivicResolve staff portal" title="Sign in securely" description="This area is for authorized officers and administrators. Citizens can submit and track cases without an account." /><form onSubmit={submit} className="mt-8 space-y-5"><div className="space-y-2"><Label htmlFor="staff-email">Work email</Label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="staff-email" type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@civicresolve.gov" className="pl-9" /></div></div><div className="space-y-2"><Label htmlFor="staff-password">Password</Label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input id="staff-password" type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" className="pl-9" /></div></div>{login.error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{login.error.message}</p> : null}<Button type="submit" disabled={login.isPending} className="h-11 w-full rounded-xl bg-[#121413] text-white hover:bg-[#303431]">{login.isPending ? "Checking credentials…" : "Sign in to staff workspace"}</Button><button type="button" onClick={() => setLocation("/")} className="w-full text-center text-sm font-medium text-[#39739e] hover:underline">Return to public portal</button></form></section>
      </div>
    </div>
  </main>;
}

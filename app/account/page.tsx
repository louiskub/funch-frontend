"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { authenticate, currentUser, logout, updateProfile, User } from "../auth";

type Mode = "login" | "register";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [status, setStatus] = useState("Checking your account…");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    currentUser().then((current) => { setUser(current); setStatus(""); }).catch(() => setStatus(""));
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setStatus("");
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
    try {
      const nextUser = await authenticate(mode, data);
      setUser(nextUser); setStatus("Your account is ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not sign in.");
    } finally { setPending(false); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setStatus("");
    const form = new FormData(event.currentTarget);
    try {
      const nextUser = await updateProfile({ name: String(form.get("name")), email: String(form.get("email")), phone: String(form.get("phone")) });
      setUser(nextUser); setStatus("Profile saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save your profile.");
    } finally { setPending(false); }
  }

  async function signOut() {
    setPending(true);
    try { await logout(); setUser(null); setStatus("You are signed out."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Could not sign out."); }
    finally { setPending(false); }
  }

  return <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
    <Link href="/" className="text-sm underline">Browse cars</Link>
    <h1 className="mt-5 text-3xl font-semibold">Your account</h1>
    {status && <p role="status" className="mt-4 rounded bg-zinc-100 p-3">{status}</p>}
    {user ? <>
      <p className="mt-3 text-sm text-zinc-700">Signed in as {user.email}</p>
      <form onSubmit={saveProfile} className="mt-6 grid gap-4">
        <label className="grid gap-1">Name<input className="rounded border p-2" name="name" required maxLength={120} defaultValue={user.name} /></label>
        <label className="grid gap-1">Email<input className="rounded border p-2" name="email" type="email" required maxLength={254} defaultValue={user.email} /></label>
        <label className="grid gap-1">Phone<input className="rounded border p-2" name="phone" required minLength={3} maxLength={40} defaultValue={user.phone} /></label>
        <div className="flex gap-3"><button disabled={pending} className="rounded bg-zinc-900 px-4 py-2 text-white">Save profile</button><button type="button" disabled={pending} onClick={signOut} className="rounded border px-4 py-2">Sign out</button></div>
      </form>
    </> : <>
      <div className="mt-6 flex gap-4 border-b"><button className={`pb-2 ${mode === "login" ? "border-b-2 border-zinc-900 font-semibold" : ""}`} onClick={() => { setMode("login"); setStatus(""); }}>Sign in</button><button className={`pb-2 ${mode === "register" ? "border-b-2 border-zinc-900 font-semibold" : ""}`} onClick={() => { setMode("register"); setStatus(""); }}>Create account</button></div>
      <form onSubmit={signIn} className="mt-5 grid gap-4">
        {mode === "register" && <label className="grid gap-1">Name<input className="rounded border p-2" name="name" required maxLength={120} /></label>}
        <label className="grid gap-1">Email<input className="rounded border p-2" name="email" type="email" required maxLength={254} /></label>
        <label className="grid gap-1">Password<input className="rounded border p-2" name="password" type="password" required minLength={mode === "register" ? 12 : 1} maxLength={128} /></label>
        {mode === "register" && <label className="grid gap-1">Phone<input className="rounded border p-2" name="phone" required minLength={3} maxLength={40} /></label>}
        <button disabled={pending} className="w-fit rounded bg-zinc-900 px-4 py-2 text-white">{mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
    </>}
  </main>;
}

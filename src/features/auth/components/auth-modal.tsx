"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "../hooks/use-auth";
import { useAuthModalStore, type AuthModalMode } from "../store/use-auth-modal-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserIcon,
  XIcon,
  AlertCircleIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function AuthModal() {
  const router = useRouter();
  const t = useTranslations("auth");
  const { login, isLoggingIn, register, isRegistering } = useAuth();
  const { isOpen, mode, redirectUrl, onSuccess, closeAuthModal, setModalMode } =
    useAuthModalStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const firstInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isPending = isLoggingIn || isRegistering;

  const handleClose = useCallback(() => {
    setErrorMessage("");
    closeAuthModal();
  }, [closeAuthModal]);

  // Lock body scroll and focus first input on open
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first input after modal renders
    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, mode]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  function handleSwitchMode(newMode: AuthModalMode) {
    setErrorMessage("");
    setModalMode(newMode);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    try {
      let authenticatedUser;
      if (mode === "login") {
        authenticatedUser = await login({ email, password });
      } else {
        authenticatedUser = await register({ name, email, password, phone });
      }

      handleClose();

      if (onSuccess) {
        onSuccess();
      }

      if (redirectUrl?.startsWith("/") && !redirectUrl.startsWith("//")) {
        router.push(redirectUrl);
      } else if (authenticatedUser.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : mode === "login"
            ? "Sign in failed"
            : "Registration failed",
      );
    }
  }

  if (!isOpen) {
    return null;
  }

  const isLogin = mode === "login";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-foreground/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={handleClose}
      aria-hidden={!isOpen}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative w-full max-w-[460px] rounded-[18px] border border-border bg-card shadow-2xl overflow-hidden transition-all duration-200 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b border-border bg-secondary/60 px-6 pt-6 pb-4 sm:px-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-full bg-primary text-white shadow-xs">
                <UserIcon size={18} />
              </div>
              <span className="text-xs font-bold tracking-tight text-primary">
                FUNCH Car Rental
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              aria-label={t("close")}
              className="grid size-8 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 cursor-pointer"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="mt-4">
            <h2
              id="auth-modal-title"
              className="text-xl font-bold tracking-[-0.02em] text-foreground"
            >
              {isLogin ? t("signInTitle") : t("registerTitle")}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isLogin ? t("signInSubtitle") : t("registerSubtitle")}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-5 flex border-b border-border">
            <button
              type="button"
              className={cn(
                "pb-2.5 text-xs font-bold transition-all relative cursor-pointer",
                isLogin
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => handleSwitchMode("login")}
            >
              {t("signInTab")}
            </button>
            <button
              type="button"
              className={cn(
                "ml-6 pb-2.5 text-xs font-bold transition-all relative cursor-pointer",
                !isLogin
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => handleSwitchMode("register")}
            >
              {t("registerTab")}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7">
          {errorMessage && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-3 text-xs font-medium text-status-rejected-text animate-in fade-in"
            >
              <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t("name")}
                </label>
                <Input
                  ref={firstInputRef}
                  name="name"
                  required
                  maxLength={120}
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 text-sm rounded-[10px]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t("email")}
              </label>
              <Input
                ref={isLogin ? firstInputRef : undefined}
                name="email"
                type="email"
                required
                maxLength={254}
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-sm rounded-[10px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                {t("password")}
              </label>
              <Input
                name="password"
                type="password"
                required
                minLength={isLogin ? 1 : 12}
                maxLength={128}
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 text-sm rounded-[10px]"
              />
              {!isLogin && (
                <span className="text-xs text-muted-foreground block">
                  {t("passwordHint")}
                </span>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {t("phone")}
                </label>
                <Input
                  name="phone"
                  type="tel"
                  required
                  minLength={3}
                  maxLength={40}
                  placeholder={t("phonePlaceholder")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 text-sm rounded-[10px]"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="mt-2 h-12 w-full rounded-[10px] bg-primary text-sm font-bold text-white shadow-sm hover:bg-primary-hover active:bg-primary-hover"
            >
              {isPending
                ? isLogin
                  ? t("signingInButton")
                  : t("registeringButton")
                : isLogin
                  ? t("signInButton")
                  : t("registerButton")}
            </Button>
          </form>

          {/* Bottom Switch Link */}
          <div className="mt-5 border-t border-border pt-4 text-center text-xs text-muted-foreground">
            {isLogin ? (
              <p>
                {t("noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("register")}
                  className="font-bold text-primary underline-offset-2 hover:underline cursor-pointer"
                >
                  {t("createAccountLink")}
                </button>
              </p>
            ) : (
              <p>
                {t("haveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => handleSwitchMode("login")}
                  className="font-bold text-primary underline-offset-2 hover:underline cursor-pointer"
                >
                  {t("signInLink")}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

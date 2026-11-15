import { create } from "zustand";

export type AuthModalMode = "login" | "register";

export interface OpenAuthModalOptions {
  redirectUrl?: string;
  onSuccess?: () => void;
}

interface AuthModalState {
  isOpen: boolean;
  mode: AuthModalMode;
  redirectUrl?: string;
  onSuccess?: () => void;
  openAuthModal: (mode?: AuthModalMode, options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
  setModalMode: (mode: AuthModalMode) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  mode: "login",
  redirectUrl: undefined,
  onSuccess: undefined,
  openAuthModal: (mode = "login", options) =>
    set({
      isOpen: true,
      mode,
      redirectUrl: options?.redirectUrl,
      onSuccess: options?.onSuccess,
    }),
  closeAuthModal: () =>
    set({
      isOpen: false,
      redirectUrl: undefined,
      onSuccess: undefined,
    }),
  setModalMode: (mode) => set({ mode }),
}));

export function useAuthModal() {
  const { isOpen, mode, redirectUrl, onSuccess, openAuthModal, closeAuthModal, setModalMode } =
    useAuthModalStore();

  return {
    isOpen,
    mode,
    redirectUrl,
    onSuccess,
    open: (mode: AuthModalMode = "login", options?: OpenAuthModalOptions) =>
      openAuthModal(mode, options),
    openLogin: (options?: OpenAuthModalOptions) => openAuthModal("login", options),
    openRegister: (options?: OpenAuthModalOptions) => openAuthModal("register", options),
    close: closeAuthModal,
    setMode: setModalMode,
  };
}

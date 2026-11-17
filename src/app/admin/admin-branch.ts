const ADMIN_BRANCH_KEY = "funch-admin-branch";

export function getRememberedAdminBranch(): string {
  return window.sessionStorage.getItem(ADMIN_BRANCH_KEY) ?? "";
}

export function rememberAdminBranch(branchId: string): void {
  if (branchId) window.sessionStorage.setItem(ADMIN_BRANCH_KEY, branchId);
}

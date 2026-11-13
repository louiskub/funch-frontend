import { apiRequest } from "./catalog";

export type User = { id: string; email: string; name: string; phone: string; role: "CUSTOMER" | "ADMIN"; isSuspended: boolean };

function parseUser(value: unknown): User {
  if (typeof value !== "object" || value === null || !("user" in value)) throw new Error("The API returned unexpected data.");
  const user = value.user;
  if (typeof user !== "object" || user === null || !("id" in user) || !("email" in user) || !("name" in user) || !("phone" in user) || !("role" in user) || !("isSuspended" in user)) throw new Error("The API returned unexpected data.");
  if (typeof user.id !== "string" || typeof user.email !== "string" || typeof user.name !== "string" || typeof user.phone !== "string" || (user.role !== "CUSTOMER" && user.role !== "ADMIN") || typeof user.isSuspended !== "boolean") throw new Error("The API returned unexpected data.");
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, isSuspended: user.isSuspended };
}

export async function currentUser(): Promise<User> {
  return parseUser(await apiRequest("/auth/me"));
}
export async function authenticate(action: "login" | "register", data: Record<string, string>): Promise<User> {
  return parseUser(await apiRequest(`/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }));
}
export async function updateProfile(data: Pick<User, "name" | "email" | "phone">): Promise<User> {
  return parseUser(await apiRequest("/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }));
}
export async function logout(): Promise<void> {
  await apiRequest("/auth/logout", { method: "POST" });
}

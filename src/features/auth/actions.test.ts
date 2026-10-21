import { beforeEach, describe, expect, it, vi } from "vitest";

const { authSignOut, redirect } = vi.hoisted(() => ({
  authSignOut: vi.fn(),
  // Like Next's redirect(), never returns.
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock("@/lib/auth/server", () => ({ auth: { signOut: authSignOut } }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

const { signOut } = await import("./actions");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("signOut", () => {
  it("redirects to /login once the session is ended", async () => {
    authSignOut.mockResolvedValue({ data: { success: true }, error: null });

    await expect(signOut({ status: "idle" })).rejects.toThrow(
      "redirect:/login",
    );
  });

  it("stays put and reports the failure when Neon Auth can't end the session", async () => {
    authSignOut.mockResolvedValue({
      data: null,
      error: { message: "fetch failed", status: 502, code: "NETWORK_ERROR" },
    });

    const result = await signOut({ status: "idle" });

    expect(result).toEqual({
      status: "error",
      message: "Couldn't sign out. Check your connection and try again.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});

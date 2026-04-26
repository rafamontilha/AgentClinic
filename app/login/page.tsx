import { loginAction } from "./actions";

type SearchParams = Promise<{ error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const hasError = !!params.error;

  return (
    <main style={{ display: "flex", justifyContent: "center", padding: "4rem 1rem" }}>
      <article style={{ width: "100%", maxWidth: "24rem" }}>
        <hgroup>
          <h2>AgentClinic</h2>
          <p>Staff sign-in</p>
        </hgroup>

        {hasError && (
          <p role="alert" style={{ color: "var(--pico-del-color, #c0392b)", marginBottom: "1rem" }}>
            Invalid password. Please try again.
          </p>
        )}

        <form action={loginAction}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            autoComplete="current-password"
            aria-label="Staff password"
          />
          <button type="submit" style={{ width: "100%", marginTop: "0.5rem" }}>
            Sign in
          </button>
        </form>
      </article>
    </main>
  );
}

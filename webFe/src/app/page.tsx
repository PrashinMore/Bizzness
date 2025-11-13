import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-zinc-50 px-6 py-16 font-sans text-zinc-900">
      <section className="max-w-2xl text-center space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">
          Bizzness Control Center
        </h1>
        <p className="text-lg text-zinc-600">
          Securely manage staff access, track sales activity, and keep your
          operations aligned. Start by creating an account or logging in with
          your existing credentials.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/signup"
          className="rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium uppercase tracking-wide text-white transition hover:bg-zinc-700"
        >
          Create Account
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-zinc-300 px-8 py-3 text-sm font-medium uppercase tracking-wide text-zinc-900 transition hover:border-zinc-900 hover:text-zinc-900"
        >
          Log In
        </Link>
      </div>
    </main>
  );
}

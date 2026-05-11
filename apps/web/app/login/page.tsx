import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign In - Forceweaver",
  description: "Sign in to your Forceweaver account to access Rev Cloud Blueprint Pro features.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_uri?: string; redirectTo?: string }>;
}) {
  const params = await searchParams;
  const redirectUri = params.redirect_uri;
  const redirectTo = params.redirectTo || '/dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-celestial-blue rounded-lg flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-indigo-dye">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-indigo-dye/70">
            Or{' '}
            <a
              href="/signup"
              className="font-medium text-celestial-blue hover:opacity-80 transition-opacity"
            >
              create a new account
            </a>
          </p>
        </div>
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <LoginForm redirectUri={redirectUri} redirectTo={redirectTo} />
        </Suspense>
      </div>
    </div>
  );
}

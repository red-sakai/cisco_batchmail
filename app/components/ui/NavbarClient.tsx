"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/app/actions/auth";

type Props = {
  darkMode: boolean;
  onToggleDark: () => void;
};

export default function NavbarClient({ darkMode, onToggleDark }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutAction();
    } finally {
      router.replace("/signin");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-[#22405f] dark:bg-[#0c1c33]/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src="/cisco-logo.jpg"
            alt="Cisco"
            width={96}
            height={32}
            className="h-8 w-auto rounded-sm border border-gray-200 bg-white p-0.5 dark:border-[#22405f]"
            priority
          />
          <div
            aria-hidden="true"
            className="hidden h-8 w-px bg-gray-200 dark:bg-[#22405f] sm:block"
          />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold tracking-tight text-gray-900">
              BatchMail
            </div>
            <div className="truncate text-xs text-gray-500">
              Cisco NetConnect PUP · Manila
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-[#049fd9]/30 bg-[#ebf6fc] dark:bg-[#10263f] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0071a4] dark:text-[#7dd3fc] md:inline-block">
            Internal Tool
          </span>
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            title="Sign out"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60 dark:border-[#22405f] dark:bg-transparent dark:text-[#c7d9ea] dark:hover:bg-[#10263f]"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          <button
            id="tutorial-dark-toggle"
            type="button"
            onClick={onToggleDark}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Light mode" : "Dark mode"}
            className={`rounded-full border p-2 shadow-sm transition ${
              darkMode
                ? "border-gray-800 bg-gray-900 text-gray-100 hover:bg-gray-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M21.752 15.002A9 9 0 0 1 9 2.248a.75.75 0 0 0-.9-.9 10.5 10.5 0 1 0 12.552 12.552.75.75 0 0 0-.9-.898Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
                <path d="M12 2.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75Zm0 15.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V18a.75.75 0 0 1 .75-.75Zm9-6a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM5.25 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75ZM18.196 5.804a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM7.924 16.076a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 0 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM5.804 5.804a.75.75 0 0 1 1.06 0l1.061 1.06A.75.75 0 0 1 6.864 7.925L5.804 6.864a.75.75 0 0 1 0-1.06Zm10.272 10.272a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.061 1.061l-1.06-1.061a.75.75 0 0 1 0-1.06Z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

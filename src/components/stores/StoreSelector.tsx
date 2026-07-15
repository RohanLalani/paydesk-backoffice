"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightFromLine, CheckCircle2, Loader2, Plus, Search } from "lucide-react";
import { CreateStoreModal } from "@/src/components/stores/CreateStoreModal";
import { StoreCard } from "@/src/components/stores/StoreCard";
import {
  isStoreSortOption,
  STORE_SORT_KEY,
  StoreSortMenu,
  type StoreSortOption,
} from "@/src/components/stores/StoreSortMenu";
import { fetchMyStores, normalizeStoreResponse } from "@/src/features/stores/api";
import type { Store } from "@/src/features/stores/types";
import { clearSelectedStoreStorage, saveSelectedStore } from "@/src/context/StoreContext";
import { clearAuth, getAccount, getToken } from "@/src/lib/authStorage";
import { getStoreTypeConfig } from "@/src/lib/storeTypeConfig";
import { getStoredTheme, type PayDeskTheme } from "@/src/lib/theme";

type LoadState = "loading" | "ready" | "error";

const themeStyles = {
  light: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.09)_0%,rgba(124,92,255,0.035)_36%,rgba(255,255,255,0)_62%),linear-gradient(180deg,#f8f7ff_0%,#f4f3fb_100%)] text-slate-950",
    frame: "border-[#d7d1ec] bg-[#f7f6fe]/95 shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
    border: "border-[#d8d2ee]",
    title: "text-slate-950",
    subtitle: "text-slate-700",
    logo: "text-[#4f2df2]",
    input: "border-[#d8d2ee] bg-white text-slate-900 placeholder:text-slate-500 focus:border-[#7c5cff] focus:ring-[#7c5cff]/20",
    mutedButton: "border-[#d8d2ee] bg-white text-slate-700 hover:border-[#7c5cff]/50 hover:text-[#4f2df2]",
    empty: "border-[#d8d2ee] bg-white text-slate-600",
  },
  dark: {
    screen:
      "bg-[radial-gradient(circle_at_50%_0%,rgba(124,92,255,0.12)_0%,rgba(37,99,235,0.05)_35%,rgba(2,6,23,0)_63%),linear-gradient(180deg,#050a19_0%,#071126_100%)] text-[#eceaff]",
    frame: "border-indigo-200/12 bg-[#071126]/94 shadow-[0_28px_90px_rgba(0,0,0,0.36)]",
    border: "border-indigo-200/10",
    title: "text-[#f3f1ff]",
    subtitle: "text-slate-300",
    logo: "text-[#c8c1ff]",
    input: "border-indigo-200/10 bg-[#050a19] text-[#f3f1ff] placeholder:text-slate-500 focus:border-[#7c5cff] focus:ring-[#7c5cff]/20",
    mutedButton: "border-indigo-200/10 bg-[#0b1026] text-slate-300 hover:border-[#7c5cff]/60 hover:text-[#c8c1ff]",
    empty: "border-indigo-200/10 bg-[#0b1026]/88 text-slate-300",
  },
} satisfies Record<PayDeskTheme, Record<string, string>>;

function hasCreatePermission() {
  const account = getAccount();

  if (!account) {
    return false;
  }

  return account.role === "owner" || account.permissions?.includes("add_store") === true;
}

function getDisplayName() {
  const account = getAccount();
  return account?.name || account?.email || "PayDesk user";
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/);

  if (!parts[0]) {
    return "PD";
  }

  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function getCreatedTime(store: Store) {
  const createdAt = store.createdAt;

  if (typeof createdAt !== "string") {
    return 0;
  }

  const time = new Date(createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getActiveRank(store: Store) {
  const value = String(store.status ?? "").toLowerCase();

  if (store.isActive === false || value.includes("inactive") || value.includes("maintenance")) {
    return 1;
  }

  return 0;
}

function sortStores(storesToSort: Store[], sortOption: StoreSortOption) {
  return [...storesToSort].sort((first, second) => {
    if (sortOption === "recently_added") {
      return getCreatedTime(second) - getCreatedTime(first);
    }

    if (sortOption === "oldest_added") {
      return getCreatedTime(first) - getCreatedTime(second);
    }

    if (sortOption === "name_az") {
      return first.name.localeCompare(second.name);
    }

    if (sortOption === "name_za") {
      return second.name.localeCompare(first.name);
    }

    if (sortOption === "active_first") {
      return getActiveRank(first) - getActiveRank(second) || first.name.localeCompare(second.name);
    }

    return getStoreTypeConfig(first).label.localeCompare(getStoreTypeConfig(second).label) ||
      first.name.localeCompare(second.name);
  });
}

function SkeletonCard({ theme }: { theme: PayDeskTheme }) {
  const isDark = theme === "dark";

  return (
    <div
      className={`rounded-[8px] border p-4 ${
        isDark ? "border-indigo-200/10 bg-[#0b1026]/88" : "border-[#d8d2ee] bg-white"
      }`}
    >
      <div className="flex gap-4">
        <div className={`size-[54px] rounded-[7px] ${isDark ? "bg-white/10" : "bg-slate-100"}`} />
        <div className="flex-1 space-y-3">
          <div className={`h-5 w-3/5 rounded ${isDark ? "bg-white/10" : "bg-slate-100"}`} />
          <div className={`h-4 w-4/5 rounded ${isDark ? "bg-white/10" : "bg-slate-100"}`} />
          <div className="flex items-center justify-between pt-4">
            <div className={`h-7 w-20 rounded-full ${isDark ? "bg-white/10" : "bg-slate-100"}`} />
            <div className={`h-10 w-34 rounded-[6px] ${isDark ? "bg-white/10" : "bg-slate-100"}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoreSelector() {
  const router = useRouter();
  const [theme, setTheme] = useState<PayDeskTheme>("light");
  const [stores, setStores] = useState<Store[]>([]);
  const [query, setQuery] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [sortOption, setSortOption] = useState<StoreSortOption>("recently_added");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [displayName, setDisplayName] = useState("PayDesk user");
  const styles = themeStyles[theme];

  async function loadStores() {
    setLoadState("loading");

    try {
      const response = await fetchMyStores();
      setStores(normalizeStoreResponse(response));
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      setTheme(getStoredTheme());
      setCanCreate(hasCreatePermission());
      setDisplayName(getDisplayName());
      const savedSort = window.localStorage.getItem(STORE_SORT_KEY);
      setSortOption(isStoreSortOption(savedSort) ? savedSort : "recently_added");
    });

    if (!getToken()) {
      router.replace("/login");
      return;
    }

    queueMicrotask(() => {
      void loadStores();
    });
  }, [router]);

  const visibleStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredStores = normalizedQuery
      ? stores.filter((store) =>
          `${store.name} ${store.address ?? ""}`.toLowerCase().includes(normalizedQuery),
        )
      : stores;

    return sortStores(filteredStores, sortOption);
  }, [query, sortOption, stores]);

  function handleSortChange(nextSort: StoreSortOption) {
    setSortOption(nextSort);
    window.localStorage.setItem(STORE_SORT_KEY, nextSort);
  }

  function handleOpenStore(store: Store) {
    saveSelectedStore(store);
    router.push("/dashboard");
  }

  function handleLogout() {
    clearSelectedStoreStorage();
    clearAuth();
    router.replace("/login");
  }

  function handleCreateStore() {
    setSuccessMessage("");
    setShowCreateModal(true);
  }

  async function handleStoreCreated() {
    await loadStores();
    setSuccessMessage("Store created successfully.");
  }

  return (
    <main className={`min-h-dvh w-full px-4 py-6 sm:px-6 lg:px-8 ${styles.screen}`}>
      <motion.section
        className={`mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[900px] flex-col rounded-[14px] border backdrop-blur-xl ${styles.frame}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        aria-labelledby="store-select-title"
      >
        <header className={`flex items-center justify-between border-b px-5 py-4 sm:px-7 ${styles.border}`}>
          <div className="flex items-center gap-3">
            <Image
              src="/paydesk-logo-transparent.png"
              alt=""
              width={34}
              height={34}
              priority
              className="size-8"
            />
            <span className={`text-2xl font-bold tracking-normal ${styles.logo}`}>PayDesk</span>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => router.push("/settings/account")}
              className={`grid size-10 cursor-pointer place-items-center rounded-full border text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7c5cff]/35 ${
                theme === "dark"
                  ? "border-indigo-200/20 bg-slate-800 text-[#eceaff] hover:border-[#7c5cff]/60 hover:bg-slate-700"
                  : "border-[#d8d2ee] bg-white text-slate-700 hover:border-[#7c5cff]/60 hover:text-[#4f2df2]"
              }`}
              aria-label="Account Settings"
              title={displayName}
            >
              {getInitials(displayName)}
            </motion.button>
            <button
              type="button"
              onClick={handleLogout}
              className={`grid size-10 place-items-center rounded-[8px] transition ${styles.mutedButton}`}
              aria-label="Log out"
              title="Log out"
            >
              <ArrowRightFromLine className="size-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-5 py-8 sm:px-7 lg:px-9">
          <div>
            <h1 id="store-select-title" className={`text-3xl font-bold leading-tight tracking-normal ${styles.title}`}>
              Select a Store
            </h1>
            <p className={`mt-3 max-w-[420px] text-base font-medium leading-6 ${styles.subtitle}`}>
              Choose the location you want to manage today.
            </p>
          </div>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stores..."
                className={`h-12 w-full rounded-[8px] border pl-12 pr-4 text-sm font-medium outline-none transition focus:ring-4 ${styles.input}`}
              />
            </label>

            <div className="flex gap-3">
              {canCreate ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreateStore}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[7px] bg-[#4f2df2] px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(79,45,242,0.28)] transition hover:bg-[#4322dd] sm:flex-none"
                >
                  <Plus className="size-5" aria-hidden="true" />
                  Create Store
                </motion.button>
              ) : null}

              <StoreSortMenu
                theme={theme}
                value={sortOption}
                isOpen={isSortOpen}
                onToggle={() => setIsSortOpen((value) => !value)}
                onClose={() => setIsSortOpen(false)}
                onChange={handleSortChange}
              />
            </div>
          </div>

          {successMessage ? (
            <motion.div
              className={`mt-5 flex items-center gap-2 rounded-[8px] border px-4 py-3 text-sm font-semibold ${
                theme === "dark"
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {successMessage}
            </motion.div>
          ) : null}

          <div className="mt-6 grid flex-1 content-start gap-4 overflow-y-auto pb-2 lg:grid-cols-2">
            {loadState === "loading" ? (
              Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index} theme={theme} />)
            ) : null}

            {loadState === "error" ? (
              <div className={`rounded-[8px] border p-6 lg:col-span-2 ${styles.empty}`}>
                <h2 className={`text-lg font-bold ${styles.title}`}>Could not load stores</h2>
                <button
                  type="button"
                  onClick={loadStores}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd]"
                >
                  <Loader2 className="size-4" aria-hidden="true" />
                  Retry
                </button>
              </div>
            ) : null}

            {loadState === "ready" && visibleStores.length
              ? visibleStores.map((store, index) => (
                  <StoreCard
                    key={store.id}
                    store={store}
                    index={index}
                    theme={theme}
                    onOpen={handleOpenStore}
                  />
                ))
              : null}

            {loadState === "ready" && !visibleStores.length ? (
              <div className={`rounded-[8px] border p-6 lg:col-span-2 ${styles.empty}`}>
                <h2 className={`text-lg font-bold ${styles.title}`}>
                  {stores.length ? "No matching stores" : "No stores available"}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6">
                  {stores.length
                    ? "Try a different store name or address."
                    : "You do not currently have access to any stores."}
                </p>
                {!stores.length && canCreate ? (
                  <button
                    type="button"
                    onClick={handleCreateStore}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-[7px] bg-[#4f2df2] px-4 text-sm font-bold text-white transition hover:bg-[#4322dd]"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Create Store
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </motion.section>

      <AnimatePresence>
        {showCreateModal ? (
          <CreateStoreModal
            theme={theme}
            canCreate={canCreate}
            onClose={() => setShowCreateModal(false)}
            onCreated={handleStoreCreated}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

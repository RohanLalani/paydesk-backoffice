"use client";
import { useQuery } from "@tanstack/react-query";
import { BadgePercent, LoaderCircle, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BackOfficeShell } from "@/src/components/layout/BackOfficeShell";
import { ProductsSidebar } from "@/src/components/layout/ProductsSidebar";
import { listPromotions, promotionTypes } from "@/src/features/promotions/api";

export function PromotionsWorkspace() {
  return (
    <BackOfficeShell
      activeItem="products"
      requiredPermission="manage_products"
      sectionSidebar={({ theme }) => <ProductsSidebar theme={theme} />}
    >
      {({ theme, selectedStore }) => (
        <Content storeId={selectedStore.id} dark={theme === "dark"} />
      )}
    </BackOfficeShell>
  );
}
function Content({ storeId, dark }: { storeId: string; dark: boolean }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [stackable, setStackable] = useState("");
  const query = useQuery({
    queryKey: ["promotions", storeId, search, type, status, stackable],
    queryFn: () =>
      listPromotions(storeId, {
        search,
        type,
        status,
        stackable: stackable || undefined,
      }),
  });
  const panel = dark
    ? "border-slate-400/15 bg-[#0f172a]"
    : "border-[#ded8f3] bg-white";
  const input = `h-10 rounded-[8px] border px-3 text-sm font-semibold outline-none ${dark ? "border-slate-400/20 bg-slate-900" : "border-[#ded8f3] bg-white"}`;
  return (
    <section className={`rounded-[8px] border p-5 ${panel}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Promotions</h1>
          <p
            className={`mt-2 text-sm font-semibold ${dark ? "text-slate-400" : "text-slate-500"}`}
          >
            Create, schedule, and manage store promotions.
          </p>
        </div>
        <Link
          href="/products/promotions/new"
          className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#4f2df2] px-4 text-sm font-extrabold text-white"
        >
          <Plus className="size-4" />
          Add New Promotion
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <label className="relative grow">
          <Search className="absolute left-3 top-3 size-4 text-slate-400" />
          <input
            aria-label="Search promotions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or description"
            className={`${input} w-full pl-9`}
          />
        </label>
        <select
          aria-label="Promotion type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={input}
        >
          <option value="">All types</option>
          {promotionTypes.map((item) => (
            <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
          ))}
        </select>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={input}
        >
          <option value="">All statuses</option>
          {[
            "ACTIVE",
            "SCHEDULED",
            "DRAFT",
            "PAUSED",
            "EXPIRED",
            "INACTIVE",
            "ARCHIVED",
          ].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="Stacking"
          value={stackable}
          onChange={(e) => setStackable(e.target.value)}
          className={input}
        >
          <option value="">Any stacking</option>
          <option value="true">Stackable</option>
          <option value="false">Non-stackable</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-[8px] border border-slate-400/20">
        {query.isLoading ? (
          <div className="grid min-h-48 place-items-center">
            <LoaderCircle className="size-6 animate-spin text-[#7c5cff]" />
          </div>
        ) : query.isError ? (
          <div className="p-8 text-center font-bold text-red-500">
            Promotions could not be loaded.
          </div>
        ) : !query.data?.items.length ? (
          <div className="p-12 text-center">
            <BadgePercent className="mx-auto size-10 text-[#7c5cff]" />
            <h2 className="mt-3 font-extrabold">No promotions yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Create your first promotion to get started.
            </p>
            <Link
              href="/products/promotions/new"
              className="mt-4 inline-flex rounded-[8px] bg-[#4f2df2] px-4 py-2 text-sm font-bold text-white"
            >
              Add New Promotion
            </Link>
          </div>
        ) : (
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-400/20 text-xs uppercase text-slate-500">
                {[
                  "Promotion name",
                  "Type",
                  "Status",
                  "Start",
                  "End",
                  "Products",
                  "Stackable",
                  "Priority",
                  "Last updated",
                  "Actions",
                ].map((label) => (
                  <th key={label} className="px-3 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer border-b border-slate-400/15 hover:bg-[#7c5cff]/10"
                  onClick={() =>
                    (location.href = `/products/promotions/edit?id=${item.id}`)
                  }
                >
                  <td className="px-3 py-3 font-extrabold">
                    {item.name}
                    <span className="block max-w-52 truncate text-xs font-medium text-slate-500">
                      {item.description}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {item.type.replaceAll("_", " ")}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-[#7c5cff]/15 px-2 py-1 text-xs font-extrabold text-[#7c5cff]">
                      {item.effectiveStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3">{formatDate(item.startAt)}</td>
                  <td className="px-3 py-3">{formatDate(item.endAt)}</td>
                  <td className="px-3 py-3">{item.productCount ?? 0}</td>
                  <td className="px-3 py-3">{item.stackable ? "Yes" : "No"}</td>
                  <td className="px-3 py-3">{item.priority}</td>
                  <td className="px-3 py-3">{formatDate(item.updatedAt)}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/products/promotions/edit?id=${item.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-[#7c5cff]"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Open ended";
}

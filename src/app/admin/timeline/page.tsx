"use client";

import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { AdminLayout } from "../admin-layout";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MapPinIcon } from "@/components/ui/icons";
import { apiRecord, apiRequest } from "@/app/catalog";
import { getRememberedAdminBranch, rememberAdminBranch } from "../admin-branch";
import { FleetTimeline } from "@/features/admin/fleet-timeline";
import { OptionTimeline } from "@/features/admin/option-timeline";

const branchesSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  countryCode: z.string(),
  timezone: z.string(),
  isActive: z.boolean(),
}));

type Branch = z.infer<typeof branchesSchema>[number];

export default function AdminTimelinePage() {
  const tAdmin = useTranslations("admin.workspacePages");
  const t = useTranslations("admin.timelinePage");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [activeTab, setActiveTab] = useState<"fleet" | "options">("fleet");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    apiRequest("/admin/fleet/branches", { signal: controller.signal })
      .then((value) => branchesSchema.parse(value))
      .then((items) => {
        setBranches(items);
        const remembered = items.find((branch) => branch.id === getRememberedAdminBranch());
        const selected = remembered ?? items[0];
        if (selected) {
          setBranchId(selected.id);
          rememberAdminBranch(selected.id);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : t("loadFailed"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [t]);

  const branch = branches.find((item) => item.id === branchId);
  const activeTabId = (tab: "fleet" | "options") => `timeline-${tab}-tab`;

  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = activeTab === "fleet" ? "options" : "fleet";
    setActiveTab(next);
    document.getElementById(activeTabId(next))?.focus();
  }

  return (
    <AdminLayout title={tAdmin("timelineTitle")} subtitle={tAdmin("timelineSubtitle")}>
      {error ? (
        <p role="alert" className="rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-5 text-sm text-status-rejected-text">{error}</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-border bg-white p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MapPinIcon size={15} className="text-primary" />
                {t("branch")}
              </span>
              <SearchableSelect
                label={t("branch")}
                icon={<MapPinIcon size={14} className="text-primary" />}
                value={branchId}
                onChange={(value) => {
                  setBranchId(value);
                  rememberAdminBranch(value);
                }}
                options={branches.map((item) => ({ value: item.id, label: item.name, sublabel: `${item.city} · ${item.countryCode}`, badge: item.isActive ? undefined : t("inactive") }))}
                placeholder={tAdmin("selectBranch")}
                searchPlaceholder={tAdmin("searchBranches")}
                className="min-w-56"
                disabled={loading || branches.length === 0}
              />
            </div>
            {branch && <span className="text-xs text-muted-foreground">{branch.timezone}</span>}
          </div>

          {loading ? (
            <p role="status" className="rounded-[10px] bg-surface-soft p-8 text-center text-sm text-muted-foreground">{t("loading")}</p>
          ) : !branch ? (
            <p className="rounded-[10px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("noBranches")}</p>
          ) : (
            <>
              <div className="mb-6 flex gap-2 border-b border-border" role="tablist" aria-label={t("tabs")}>
                {(["fleet", "options"] as const).map((tab) => (
                  <button
                    key={tab}
                    id={activeTabId(tab)}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`timeline-${tab}-panel`}
                    tabIndex={activeTab === tab ? 0 : -1}
                    onClick={() => setActiveTab(tab)}
                    onKeyDown={moveTab}
                    className={`border-b-2 px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    {t(`${tab}Tab`)}
                  </button>
                ))}
              </div>
              <div id="timeline-fleet-panel" role="tabpanel" aria-labelledby="timeline-fleet-tab" hidden={activeTab !== "fleet"}>
                {activeTab === "fleet" && <FleetTimeline key={branch.id} branch={branch} />}
              </div>
              <div id="timeline-options-panel" role="tabpanel" aria-labelledby="timeline-options-tab" hidden={activeTab !== "options"}>
                {activeTab === "options" && <OptionTimeline key={branch.id} branch={branch} />}
              </div>
            </>
          )}
        </>
      )}
    </AdminLayout>
  );
}

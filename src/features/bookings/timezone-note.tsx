"use client";

import { useTranslations } from "next-intl";
import { timeZoneOffsetRange } from "./time";

type BranchTimeZoneNoteProps = {
  branchName: string;
  timeZone: string;
  pickupAt: string;
  returnAt: string;
  className?: string;
};

export function BranchTimeZoneNote({
  branchName,
  timeZone,
  pickupAt,
  returnAt,
  className = "text-xs text-muted-foreground",
}: BranchTimeZoneNoteProps) {
  const t = useTranslations("timezone");
  let offset: string | null = null;

  try {
    offset = timeZoneOffsetRange(pickupAt, returnAt, timeZone);
  } catch {
    // Keep the branch timezone visible while a selected wall time is invalid.
  }

  return (
    <p className={className}>
      {offset
        ? t("branchLocalTime", { branch: branchName, timeZone, offset })
        : t("branchLocalTimeZoneOnly", { branch: branchName, timeZone })}
    </p>
  );
}

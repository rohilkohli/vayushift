"use client";
import { useCallback, useEffect, useState } from "react";

export type Tab = "choreographer" | "lab" | "community";
const TAB_IDS: readonly Tab[] = ["choreographer", "lab", "community"];
const isTab = (id: string): id is Tab => (TAB_IDS as readonly string[]).includes(id);

/** The visible tab. Tabs are deep-linkable (#lab, #community) and work with the browser Back button. */
export function useTabs() {
  const [tab, setTab] = useState<Tab>("choreographer");

  useEffect(() => {
    const fromHash = () => {
      const id = globalThis.location.hash.slice(1);
      setTab(isTab(id) ? id : "choreographer");
    };
    fromHash();
    globalThis.addEventListener("popstate", fromHash);
    return () => globalThis.removeEventListener("popstate", fromHash);
  }, []);

  const selectTab = useCallback((id: string) => {
    if (!isTab(id)) return;
    setTab(id);
    if (globalThis.location.hash.slice(1) !== id) globalThis.history.pushState(null, "", `#${id}`);
  }, []);

  return { tab, selectTab };
}

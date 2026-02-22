import { useState, useEffect, useCallback } from "react";
import type { SnapshotResponse } from "@/types";
import { useSSEEvents } from "./useSSEEvents";

export function usePlanSnapshot() {
  const [data, setData] = useState<SnapshotResponse | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await fetch("/snapshot");
      if (!response.ok) return;
      const result: SnapshotResponse = await response.json();
      setData(result);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  useSSEEvents((data) => {
    if (data.type === "plan") void fetchSnapshot();
  });

  return { data, refresh: fetchSnapshot };
}

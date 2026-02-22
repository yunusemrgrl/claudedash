import { useState, useEffect, useCallback, useRef } from "react";
import type { ClaudeSession, SessionsResponse } from "@/types";
import { useSSEEvents, useSSEConnected } from "./useSSEEvents";

export function useSessions(showAll = false) {
  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ClaudeSession | null>(null);
  const [sessionCounts, setSessionCounts] = useState<{ total: number; filtered: number } | null>(null);
  const selectedSessionIdRef = useRef<string | null>(null);
  const connected = useSSEConnected();

  useEffect(() => {
    selectedSessionIdRef.current = selectedSession?.id ?? null;
  }, [selectedSession]);

  const fetchSessions = useCallback(async () => {
    try {
      const url = showAll ? "/sessions?days=all" : "/sessions";
      const response = await fetch(url);
      if (!response.ok) return;
      const result: SessionsResponse & { total?: number; filtered?: number } = await response.json();
      setSessions(result.sessions);
      if (result.total != null) {
        setSessionCounts({ total: result.total, filtered: result.filtered ?? result.sessions.length });
      }
      const currentId = selectedSessionIdRef.current;
      if (!currentId && result.sessions.length > 0) {
        setSelectedSession(result.sessions[0]);
      } else if (currentId) {
        const updated = result.sessions.find((s) => s.id === currentId);
        if (updated) setSelectedSession(updated);
      }
    } catch {
      // ignore
    }
  }, [showAll]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useSSEEvents((data) => {
    if (data.type === "sessions") void fetchSessions();
  });

  return { sessions, selectedSession, setSelectedSession, connected, sessionCounts };
}

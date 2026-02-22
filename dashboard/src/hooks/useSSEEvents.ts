"use client";

/**
 * Module-level SSE singleton.
 * All hooks share ONE EventSource connection to /events/.
 * Reduces browser connections from 3 → 1.
 */

import { useEffect, useRef, useState } from "react";

type SSEHandler = (data: { type: string }) => void;

const subscribers = new Set<SSEHandler>();
const connListeners = new Set<(connected: boolean) => void>();
let instance: EventSource | null = null;
let globalConnected = false;

function getOrCreate(): EventSource {
  if (instance && instance.readyState !== EventSource.CLOSED) return instance;

  instance = new EventSource("/events/");

  instance.onopen = () => {
    globalConnected = true;
    connListeners.forEach((fn) => fn(true));
  };

  instance.onerror = () => {
    globalConnected = false;
    connListeners.forEach((fn) => fn(false));
  };

  instance.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string) as { type: string };
      subscribers.forEach((h) => h(data));
    } catch {
      // ignore parse errors
    }
  };

  return instance;
}

/** Subscribe to SSE events. Handler is stable via ref — safe to pass inline functions. */
export function useSSEEvents(handler: SSEHandler): void {
  const handlerRef = useRef<SSEHandler>(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const h: SSEHandler = (data) => handlerRef.current(data);
    subscribers.add(h);
    if (typeof window !== "undefined") getOrCreate();
    return () => {
      subscribers.delete(h);
    };
  }, []);
}

/** Returns live SSE connection status. */
export function useSSEConnected(): boolean {
  const [connected, setConnected] = useState(globalConnected);

  useEffect(() => {
    connListeners.add(setConnected);
    if (typeof window !== "undefined") getOrCreate();
    return () => {
      connListeners.delete(setConnected);
    };
  }, []);

  return connected;
}

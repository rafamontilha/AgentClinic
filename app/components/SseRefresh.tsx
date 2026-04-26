"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SseRefresh() {
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = () => router.refresh();
    return () => es.close();
  }, [router]);

  return null;
}

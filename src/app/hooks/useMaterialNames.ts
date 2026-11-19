"use client";

import { useEffect, useState } from "react";
import { normalizeMaterials } from "@/app/lib/createCollection";

export function useMaterialNames(token?: string) {
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map());

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/materials", {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error("Materiais indisponíveis");
        return normalizeMaterials(await response.json());
      })
      .then(materials => {
        if (!controller.signal.aborted) {
          setNames(new Map(materials.flatMap(material => [
            [material.id, material.name] as const,
            [material.name, material.name] as const,
          ])));
        }
      })
      .catch(() => { if (!controller.signal.aborted) setNames(new Map()); });
    return () => controller.abort();
  }, [token]);

  return names;
}

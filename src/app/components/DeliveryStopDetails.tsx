"use client";

import { useEffect, useState } from "react";
import { MapPin, Package, Scale, UserRound } from "lucide-react";
import {
  CollectionSummary,
  formatCollectionAddress,
  formatWeight,
  normalizeCollections,
  normalizeCounterpartProfile,
} from "@/app/lib/collectionsPage";

export default function DeliveryStopDetails({ collectionId, token, materialNames }: {
  collectionId: string;
  token?: string;
  materialNames: Record<string, string>;
}) {
  const [collection, setCollection] = useState<CollectionSummary>();
  const [generatorName, setGeneratorName] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const options = {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
      cache: "no-store" as const,
    };
    setLoading(true);
    setFailed(false);
    setCollection(undefined);
    setGeneratorName(undefined);

    async function load() {
      try {
        const response = await fetch(`/api/collections/${encodeURIComponent(collectionId)}`, options);
        if (!response.ok) throw new Error("Collection unavailable");
        const item = normalizeCollections(await response.json())[0];
        if (!item || item.id !== collectionId) throw new Error("Invalid collection");
        if (controller.signal.aborted) return;
        setCollection(item);
        const profileResponse = await fetch(`/api/generator/${encodeURIComponent(item.generatorId)}`, options);
        if (!profileResponse.ok) throw new Error("Generator unavailable");
        const profile = normalizeCounterpartProfile(await profileResponse.json(), item.generatorId);
        if (!controller.signal.aborted) setGeneratorName(profile.name);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [collectionId, token, attempt]);

  const address = collection?.address;
  const hasAddress = Boolean(address && [address.street, address.city, address.zipCode].some(Boolean));
  const addressText = collection && hasAddress ? formatCollectionAddress(collection) : "Endereço não informado";
  const coordinates = address?.latitude !== undefined && address?.longitude !== undefined
    ? `${address.latitude},${address.longitude}` : undefined;
  const mapsQuery = coordinates ?? (hasAddress ? addressText : undefined);

  return (
    <div className="mt-4 space-y-4 text-sm text-[#415040]" aria-busy={loading}>
      {loading && <p role="status" className="text-xs">Carregando detalhes da coleta...</p>}
      {collection && (
        <>
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[#53664b]"><UserRound aria-hidden="true" className="h-3.5 w-3.5" />Gerador</dt>
              <dd className="mt-1 break-words text-base font-semibold text-[#263827]">{generatorName ?? (loading ? "Carregando nome..." : "Nome não disponível")}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[#53664b]"><Scale aria-hidden="true" className="h-3.5 w-3.5" />Peso informado</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-[#263827]">{formatWeight(collection.weight)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[#53664b]"><Package aria-hidden="true" className="h-3.5 w-3.5" />Materiais</dt>
              <dd className="mt-2 flex flex-wrap gap-1.5">
                {collection.materialIds.length ? collection.materialIds.map((id, index) => (
                  <span key={`${id}-${index}`} className="rounded-md bg-[#e9f6dc] px-2 py-1 font-medium text-[#2d5b36]">{materialNames[id] ?? id}</span>
                )) : "Materiais não informados"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-[#53664b]"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />Endereço da retirada</dt>
              <dd className="mt-1 break-words leading-relaxed">{addressText}</dd>
            </div>
          </dl>
          {mapsQuery && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#2d5b36] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Abrir no mapa <span className="sr-only">(nova aba)</span></a>}
        </>
      )}
      {failed && <div role="status" className="text-sm text-amber-900">
        <p>{collection ? "Não foi possível carregar o nome do gerador." : "Não foi possível carregar os detalhes desta coleta."}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-1 font-semibold underline underline-offset-4">Tentar novamente</button>
      </div>}
    </div>
  );
}

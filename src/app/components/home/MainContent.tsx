"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import CreateCollectionCard from "./cards/CreateCollectionCard";
import ActiveCollectionsCard from "./cards/ActiveCollectionsCard";
import EnvironmentalImpactCard from "./cards/EnvironmentalImpactCard";
import CoinsCard from "./cards/CoinsCard";
import LastCollectionsCard from "./cards/LastCollectionsCard";
import NextCollectionsCard from "./cards/NextCollectionsCard";
import { CollectionSummary, normalizeCollections } from "@/app/lib/collectionsPage";
import {
  buildHomeCollectionQuery,
  countActiveCollections,
  HomeUserType,
  mapCollectionsToLastRows,
  mapCollectionsToNextViews,
} from "@/app/lib/homeCollections";

interface MainContentProps {
  userType?: HomeUserType;
  userId?: string;
  token?: string;
}

export default function MainContent({ userType, userId, token }: MainContentProps) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsError, setCollectionsError] = useState(false);
  const materials = [{ name: "Papel", value: 1175, color: "#3B82F6" },
  { name: "Vidro", value: 1175, color: "#166534" }];

  const loadCollections = useCallback(async () => {
    const query = buildHomeCollectionQuery(userType, userId);

    if (!query) {
      setCollections([]);
      setCollectionsError(true);
      return;
    }

    setCollectionsLoading(true);
    setCollectionsError(false);

    try {
      const headers: HeadersInit = token ? { authorization: `Bearer ${token}` } : {};
      const response = await fetch(`/api/collections/search?${query.toString()}`, { headers });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("Erro ao buscar coletas.");
      }

      setCollections(normalizeCollections(data));
    } catch {
      setCollections([]);
      setCollectionsError(true);
    } finally {
      setCollectionsLoading(false);
    }
  }, [token, userId, userType]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const activeCollectionsCount = useMemo(() => countActiveCollections(collections), [collections]);
  const nextCollections = useMemo(() => mapCollectionsToNextViews(collections, 2), [collections]);
  const lastCollections = useMemo(() => mapCollectionsToLastRows(collections, 2), [collections]);

  return (
    <main className="w-full h-full bg-[#F5F5F5] p-4 md:p-14">
      <div className="flex flex-col gap-4 md:gap-10">
        {/* TOP */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-10">
          <CreateCollectionCard />
          <ActiveCollectionsCard
            count={activeCollectionsCount}
            loading={collectionsLoading}
            error={collectionsError}
          />
          <EnvironmentalImpactCard total={2350} materials={materials} />
        </div>
        {/* BOTTOM */}
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-10">
          <CoinsCard />
          {userType === "WASTE_COLLECTOR" ? (
            <NextCollectionsCard
              collections={nextCollections}
              loading={collectionsLoading}
              error={collectionsError}
            />
          ) : (
            <LastCollectionsCard
              collections={lastCollections}
              loading={collectionsLoading}
              error={collectionsError}
            />
          )}
        </div>
      </div>
    </main>
  );
}

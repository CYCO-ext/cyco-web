import {
  CollectionSummary,
  CollectionStatus,
  formatCollectionAddress,
  formatWeight,
  statusLabel,
} from "@/app/lib/collectionsPage";

export type HomeUserType = "WASTE_COLLECTOR" | "GENERATOR";

export interface NextCollectionView {
  id: string;
  date: Date;
  location: string;
  time: string;
  weight: string;
  materials: string[];
}

export interface LastCollectionRowView {
  id: string;
  kg: string;
  date: string;
  location: string;
  status: string;
  rating: number | null;
}

export function buildHomeCollectionQuery(userType?: HomeUserType, userId?: string): URLSearchParams | undefined {
  if (!userType || !userId) return undefined;

  const query = new URLSearchParams();
  query.set(userType === "WASTE_COLLECTOR" ? "collectorId" : "generatorId", userId);
  return query;
}

export function countActiveCollections(collections: CollectionSummary[]): number {
  return collections.filter((collection) => collection.status === "IN_PROGRESS").length;
}

export function mapCollectionsToNextViews(collections: CollectionSummary[], limit = 2): NextCollectionView[] {
  return collections.filter((collection) => collection.status === "IN_PROGRESS").slice(0, limit).map((collection) => {
    const date = collectionDate(collection);

    return {
      id: collection.id,
      date,
      location: formatCollectionAddress(collection),
      time: formatTime(date),
      weight: formatWeight(collection.weight),
      materials: collection.materialIds.length ? collection.materialIds : ["Sem materiais"],
    };
  });
}

export function mapCollectionsToLastRows(collections: CollectionSummary[], limit = 2): LastCollectionRowView[] {
  return collections.slice(0, limit).map((collection) => ({
    id: collection.id,
    kg: formatWeight(collection.weight),
    date: formatCompactDate(collectionDate(collection)),
    location: formatCollectionAddress(collection),
    status: statusLabel(collection.status as CollectionStatus),
    rating: null,
  }));
}

function collectionDate(collection: CollectionSummary): Date {
  const rawDate = collection.updatedAt || collection.createdAt;
  const date = new Date(rawDate);
  return Number.isNaN(date.getTime()) ? new Date(collection.createdAt) : date;
}

function formatTime(date: Date): string {
  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCompactDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "--/--";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

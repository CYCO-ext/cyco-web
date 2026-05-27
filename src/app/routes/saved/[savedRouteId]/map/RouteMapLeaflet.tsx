"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { GeoJsonObject } from "geojson";

import {
  extractRouteMapGeometry,
  RouteMapBbox,
  RouteMapCoordinate,
  RouteMapGeoJson,
} from "@/app/lib/routes";

function BoundsController({
  bbox,
  coordinates,
}: {
  bbox?: RouteMapBbox;
  coordinates: RouteMapCoordinate[];
}) {
  const map = useMap();

  useEffect(() => {
    if (bbox) {
      const [west, south, east, north] = bbox;
      map.fitBounds([[south, west], [north, east]], { padding: [24, 24], maxZoom: 17 });
      return;
    }

    const bounds = L.latLngBounds(coordinates.map(([longitude, latitude]) => [latitude, longitude]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    }
  }, [bbox, coordinates, map]);

  return null;
}

function endpointCenter(point: RouteMapCoordinate): [number, number] {
  const [longitude, latitude] = point;
  return [latitude, longitude];
}

export default function RouteMapLeaflet({
  geoJson,
  attribution,
}: {
  geoJson: RouteMapGeoJson;
  attribution?: string;
}) {
  const geometry = useMemo(() => extractRouteMapGeometry(geoJson), [geoJson]);

  if (!geometry?.start || !geometry.end) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
        Dados de geometria indisponíveis para este veículo.
      </div>
    );
  }

  const initialCenter = endpointCenter(geometry.start);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <MapContainer
        center={initialCenter}
        zoom={15}
        scrollWheelZoom
        className="h-[420px] w-full md:h-[560px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          data={geoJson as GeoJsonObject}
          style={{
            color: "#15803d",
            opacity: 0.95,
            weight: 6,
          }}
        />
        <CircleMarker
          center={endpointCenter(geometry.start)}
          radius={8}
          pathOptions={{ color: "#14532d", fillColor: "#22c55e", fillOpacity: 1, weight: 3 }}
        />
        <CircleMarker
          center={endpointCenter(geometry.end)}
          radius={8}
          pathOptions={{ color: "#7f1d1d", fillColor: "#ef4444", fillOpacity: 1, weight: 3 }}
        />
        <BoundsController bbox={geometry.bbox} coordinates={geometry.coordinates} />
      </MapContainer>

      {attribution && (
        <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
          {attribution}
        </div>
      )}
    </div>
  );
}

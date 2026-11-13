
"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { RoutePoint } from "@/types/MarsMap";

interface Props {
  route: RoutePoint[];
}

function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const radius = 3396.19;
  const rad = (value: number) => (value * Math.PI) / 180;

  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * radius * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );
}

export default function ElevationProfile({ route }: Props) {
  const data = useMemo(() => {
    let distance = 0;

    return route.map((point, index) => {
      if (index > 0) {
        const previous = route[index - 1];

        distance += distanceKm(
          previous.latitude,
          previous.longitude,
          point.latitude,
          point.longitude
        );
      }

      return {
        distance: Number(distance.toFixed(3)),
        elevation: point.elevation_m ?? null,
        latitude: point.latitude,
        longitude: point.longitude,
      };
    });
  }, [route]);

  const elevations = data
    .map((point) => point.elevation)
    .filter((value): value is number => value !== null);

  if (elevations.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        No elevation data available.
      </div>
    );
  }

  const highest = Math.max(...elevations);
  const lowest = Math.min(...elevations);
  const totalDistance = data[data.length - 1]?.distance ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Summary label="Distance" value={`${totalDistance.toFixed(1)} km`} />
        <Summary label="Highest" value={`${highest.toFixed(0)} m`} />
        <Summary label="Lowest" value={`${lowest.toFixed(0)} m`} />
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 15, left: 5, bottom: 10 }}>
            <defs>
              <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />

            <XAxis
              type="number"
              dataKey="distance"
              domain={[0, "dataMax"]}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              label={{
                value: "Distance (km)",
                position: "insideBottom",
                offset: -5,
                fill: "#94a3b8",
              }}
            />

            <YAxis
              type="number"
              domain={["auto", "auto"]}
              stroke="#94a3b8"
              tick={{ fontSize: 11 }}
              width={60}
              label={{
                value: "Elevation (m)",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
              }}
            />

            <Tooltip
              contentStyle={{
                background: "#0a1020",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#fff",
              }}
              labelFormatter={(value) => `${Number(value).toFixed(2)} km`}
              formatter={(value) => [
                value == null ? "NoData" : `${Number(value).toFixed(2)} m`,
                "Elevation",
              ]}
            />

            <Area
              type="linear"
              dataKey="elevation"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#elevationGradient)"
              connectNulls={false}
              isAnimationActive={false}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-slate-500">
        Elevation sampled from MOLA terrain data. Missing samples appear as gaps.
      </p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

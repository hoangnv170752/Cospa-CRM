"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Cpu, Wifi, WifiOff, Box, Loader2 } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";
import {
  getDeviceCounts,
  getDeviceCountsByProfile,
  DeviceCountByProfile,
} from "@/lib/device";
import {
  getAssetCount,
  getAssetCountsByProfile,
  AssetCountByProfile,
} from "@/lib/asset";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface DeviceStats {
  online: number;
  offline: number;
  total: number;
}

const COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#14b8a6", // teal
  "#a855f7", // purple
  "#eab308", // yellow
  "#6366f1", // indigo
];

const ASSET_COLORS = [
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#f97316", // orange
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#22c55e", // green
  "#3b82f6", // blue
  "#ef4444", // red
  "#eab308", // yellow
  "#06b6d4", // cyan
  "#a855f7", // purple
  "#f59e0b", // amber
];

export default function Home() {
  const t = useTranslations();
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [profileCounts, setProfileCounts] = useState<DeviceCountByProfile[]>([]);
  const [assetCount, setAssetCount] = useState<number>(0);
  const [assetProfileCounts, setAssetProfileCounts] = useState<AssetCountByProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [counts, profileData, totalAssets, assetProfiles] = await Promise.all([
          getDeviceCounts(),
          getDeviceCountsByProfile(),
          getAssetCount(),
          getAssetCountsByProfile(),
        ]);
        setStats(counts);
        setProfileCounts(profileData);
        setAssetCount(totalAssets);
        setAssetProfileCounts(assetProfiles);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  const statCards = [
    {
      title: t("dashboard.totalDevices"),
      value: stats?.total ?? 0,
      subtitleKey: "allDevices",
      icon: Cpu,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: t("common.online"),
      value: stats?.online ?? 0,
      subtitleKey: "onlinePercent",
      icon: Wifi,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: t("common.offline"),
      value: stats?.offline ?? 0,
      subtitleKey: "offlinePercent",
      icon: WifiOff,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: t("dashboard.totalAssets"),
      value: assetCount,
      subtitleKey: "allAssets",
      icon: Box,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
  ];

  const getSubtitle = (key: string) => {
    if (key === "onlinePercent" && stats) {
      return `${Math.round((stats.online / (stats.total || 1)) * 100)}%`;
    }
    if (key === "offlinePercent" && stats) {
      return `${Math.round((stats.offline / (stats.total || 1)) * 100)}%`;
    }
    return "";
  };

  // Prepare device chart data
  const deviceBarChartData = profileCounts.map((item, index) => ({
    name: item.profileName,
    value: item.count,
    fill: COLORS[index % COLORS.length],
  }));

  // Prepare asset chart data
  const assetBarChartData = assetProfileCounts.map((item, index) => ({
    name: item.profileName,
    value: item.count,
    fill: ASSET_COLORS[index % ASSET_COLORS.length],
  }));

  // Generate chart configs dynamically
  const deviceChartConfig: ChartConfig = profileCounts.reduce(
    (acc, item, index) => ({
      ...acc,
      [item.profileName]: {
        label: item.profileName,
        color: COLORS[index % COLORS.length],
      },
    }),
    { value: { label: "Devices" } } as ChartConfig
  );

  const assetChartConfig: ChartConfig = assetProfileCounts.reduce(
    (acc, item, index) => ({
      ...acc,
      [item.profileName]: {
        label: item.profileName,
        color: ASSET_COLORS[index % ASSET_COLORS.length],
      },
    }),
    { value: { label: "Assets" } } as ChartConfig
  );

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.overview")}
          </p>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.title}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {stat.title}
                      </span>
                      <div className={`rounded-md p-1.5 ${stat.bgColor}`}>
                        <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getSubtitle(stat.subtitleKey)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts - 2 columns */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Device Bar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("dashboard.devicesByProfile")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("dashboard.devicesByProfileDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {profileCounts.length > 0 ? (
                    <ChartContainer
                      config={deviceChartConfig}
                      className="h-[220px] w-full"
                    >
                      <BarChart
                        data={deviceBarChartData}
                        layout="vertical"
                        margin={{ left: 0, right: 16 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="value" radius={4}>
                          {deviceBarChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[220px] items-center justify-center text-muted-foreground">
                      {t("common.noData")}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Asset Bar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("dashboard.assetsByProfile")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("dashboard.assetsByProfileDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {assetProfileCounts.length > 0 ? (
                    <ChartContainer
                      config={assetChartConfig}
                      className="h-[220px] w-full"
                    >
                      <BarChart
                        data={assetBarChartData}
                        layout="vertical"
                        margin={{ left: 0, right: 16 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tickLine={false}
                          axisLine={false}
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="value" radius={4}>
                          {assetBarChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[220px] items-center justify-center text-muted-foreground">
                      {t("common.noData")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

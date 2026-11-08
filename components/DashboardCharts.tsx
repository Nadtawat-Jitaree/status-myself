"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart as PieChartIcon, BarChart3, Sparkles, CheckCircle2 } from "lucide-react";

interface StatusItem {
  name: string;
  value: number;
  color: string;
}

interface CategoryItem {
  name: string;
  count: number;
}

interface DashboardChartsProps {
  statusData: StatusItem[];
  categoryData: CategoryItem[];
  totalNotes?: number;
  completionRate?: number;
}

// Custom tooltip with sleek dark/light theme support
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 px-3 py-2 text-popover-foreground shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: data.payload.color }}
          />
          <span className="text-xs font-semibold">{data.name}</span>
        </div>
        <p className="mt-1 text-sm font-bold text-foreground">
          {data.value} <span className="text-xs font-normal text-muted-foreground">รายการ</span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 px-3 py-2 text-popover-foreground shadow-xl backdrop-blur-md">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-bold text-foreground">
          {payload[0].value} <span className="text-xs font-normal text-muted-foreground">บันทึก</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardCharts({
  statusData,
  categoryData,
  totalNotes = 0,
  completionRate = 0,
}: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalStatusCount = statusData.reduce((acc, curr) => acc + curr.value, 0);
  const hasStatusData = totalStatusCount > 0;
  const hasCategoryData = categoryData.length > 0;

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 w-full">
        <Card className="h-[380px] rounded-3xl border border-border/60 bg-card/50 p-6 animate-pulse" />
        <Card className="h-[380px] rounded-3xl border border-border/60 bg-card/50 p-6 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Chart 1: Donut Chart - สถานะโน้ต & ภารกิจ */}
      <Card className="group relative min-w-0 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card to-card/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border">
        {/* Decorative corner glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-500/5 blur-3xl transition-all duration-500 group-hover:bg-emerald-500/10" />

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <PieChartIcon className="h-4 w-4" />
                </span>
                <span>สัดส่วนสถานะบันทึก</span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                ภาพรวมบันทึกทั้งหมดแบ่งตามสถานะการดำเนินงาน
              </CardDescription>
            </div>
            {totalNotes > 0 && (
              <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                สำเร็จ {completionRate}%
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="min-h-[290px] flex items-center justify-center pt-2">
          {!hasStatusData ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                <PieChartIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">ยังไม่มีบันทึกในระบบ</p>
              <p className="text-xs text-muted-foreground mt-1">เริ่มต้นสร้างโน้ตเพื่อดูสัดส่วนสถานะ</p>
            </div>
          ) : (
            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-6">
              {/* Donut Chart with Center KPI */}
              <div className="relative w-full max-w-[220px] h-[220px] shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="transparent"
                    >
                      {statusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="transition-opacity hover:opacity-85 cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center KPI in Donut Hole */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-none">
                    {totalNotes}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground mt-1">
                    บันทึกทั้งหมด
                  </span>
                </div>
              </div>

              {/* Legend with Progress Indicator */}
              <div className="flex flex-col gap-2.5 w-full min-w-0 md:max-w-[200px]">
                {statusData.map((item) => {
                  const percent =
                    totalStatusCount > 0
                      ? Math.round((item.value / totalStatusCount) * 100)
                      : 0;

                  return (
                    <div
                      key={item.name}
                      className="group/item flex flex-col gap-1 rounded-xl border border-border/40 bg-muted/30 p-2 text-xs transition-colors hover:bg-muted/60 hover:border-border"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-foreground">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                          <span>{item.value}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({percent}%)
                          </span>
                        </div>
                      </div>
                      {/* Mini bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Bar Chart - แยกตามหมวดหมู่ยอดนิยม */}
      <Card className="group relative min-w-0 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card to-card/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border">
        {/* Decorative corner glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-blue-500/5 blur-3xl transition-all duration-500 group-hover:bg-blue-500/10" />

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <span>บันทึกแยกตามหมวดหมู่</span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                5 หมวดหมู่ที่มีบันทึกและกิจกรรมมากที่สุด
              </CardDescription>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-600 border border-blue-500/20">
              <Sparkles className="h-3 w-3" />
              Top Categories
            </span>
          </div>
        </CardHeader>

        <CardContent className="h-[290px] min-w-0 flex items-center justify-center pt-2">
          {!hasCategoryData ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
                <BarChart3 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">ยังไม่มีข้อมูลหมวดหมู่</p>
              <p className="text-xs text-muted-foreground mt-1">
                สร้างหมวดหมู่เพื่อจัดระเบียบโน้ตของคุณ
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 20, right: 10, left: -22, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-border/40"
                />
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                  tickMargin={8}
                  stroke="currentColor"
                  className="text-muted-foreground font-medium"
                />
                <YAxis
                  allowDecimals={false}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar
                  dataKey="count"
                  fill="currentColor"
                  radius={[8, 8, 2, 2]}
                  maxBarSize={44}
                  className="fill-black dark:fill-white text-black dark:text-white transition-all hover:opacity-85"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

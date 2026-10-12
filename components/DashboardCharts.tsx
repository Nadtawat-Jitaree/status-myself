"use client";

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

interface DashboardChartsProps {
  statusData: { name: string; value: number; color: string }[];
  categoryData: { name: string; count: number }[];
}

export default function DashboardCharts({
  statusData,
  categoryData,
}: DashboardChartsProps) {
  const hasStatusData = statusData.some((d) => d.value > 0);
  const hasCategoryData = categoryData.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Chart 1: Donut Chart สถานะงานและโน้ต */}
      <Card className="rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>สัดส่วนสถานะงานและโน้ต</span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Status Breakdown
            </span>
          </CardTitle>
          <CardDescription>
            ภาพรวมการจัดการงานและบันทึกตามสถานะ
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center pt-2">
          {!hasStatusData ? (
            <div className="text-sm text-muted-foreground text-center">
              ยังไม่มีข้อมูลบันทึกในระบบ
            </div>
          ) : (
            <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="w-full md:w-3/5 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${val} รายการ`, "จำนวน"]}
                      contentStyle={{
                        borderRadius: "12px",
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="flex flex-col gap-2 w-full md:w-2/5">
                {statusData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-semibold text-muted-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Bar Chart แยกตามหมวดหมู่ */}
      <Card className="rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>บันทึกแยกตามหมวดหมู่</span>
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Categories
            </span>
          </CardTitle>
          <CardDescription>
            หมวดหมู่ที่มีการสร้างและจัดเก็บบันทึกสูงสุด
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] flex items-center justify-center pt-2">
          {!hasCategoryData ? (
            <div className="text-sm text-muted-foreground text-center">
              ยังไม่มีหมวดหมู่หรือบันทึกในระบบ
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="name"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  tick={{ fill: "#64748b" }}
                />
                <YAxis
                  allowDecimals={false}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b" }}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} บันทึก`, "จำนวน"]}
                  contentStyle={{
                    borderRadius: "12px",
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

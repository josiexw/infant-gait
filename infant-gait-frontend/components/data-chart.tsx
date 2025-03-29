"use client"

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type ChartType = "line" | "bar" | "area"

interface DataChartProps {
  data: any[]
  type: ChartType
  xKey: string
  yKey: string
}

export default function DataChart({ data, type, xKey, yKey }: DataChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
  }

  const renderChart = () => {
    switch (type) {
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        )
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={yKey} fill="#3b82f6" />
          </BarChart>
        )
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey={yKey} stroke="#3b82f6" fill="#3b82f680" />
          </AreaChart>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}


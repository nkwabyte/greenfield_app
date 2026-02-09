"use client"

import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { format, parseISO, startOfMonth } from "date-fns"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Farmer } from "@/lib/types"

interface FarmersGrowthChartProps {
    farmers: Farmer[]
}

export function FarmersGrowthChart({ farmers }: FarmersGrowthChartProps) {
    const data = React.useMemo(() => {
        if (!farmers.length) return []

        // Group farmers by month
        const grouped = farmers.reduce((acc, farmer) => {
            const date = farmer.createdAt || farmer.joinDate
            if (!date) return acc

            const monthKey = format(startOfMonth(new Date(date)), 'yyyy-MM')
            acc[monthKey] = (acc[monthKey] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        // Convert to array and sort
        return Object.entries(grouped)
            .map(([date, count]) => ({
                date,
                count,
                label: format(parseISO(date), 'MMM yyyy'),
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
    }, [farmers])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Farmer Growth</CardTitle>
                <CardDescription>
                    New farmer registrations over time
                </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data}>
                        <XAxis
                            dataKey="label"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                        New Farmers
                                                    </span>
                                                    <span className="font-bold text-muted-foreground">
                                                        {payload[0].value}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                                return null
                            }}
                        />
                        <Bar
                            dataKey="count"
                            fill="currentColor"
                            radius={[4, 4, 0, 0]}
                            className="fill-primary"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

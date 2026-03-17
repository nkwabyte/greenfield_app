'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/components/theme-provider';

export function AppearanceForm() {
    const { theme, setTheme } = useTheme();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                    Choose how the application looks. &ldquo;System&rdquo; automatically follows your device&apos;s light or dark preference.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Theme</Label>
                        <RadioGroup
                            value={theme}
                            onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                            className="grid max-w-xl grid-cols-3 gap-4 pt-2"
                        >
                            {/* Light */}
                            <div className="items-center">
                                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                                <Label htmlFor="light" className="cursor-pointer">
                                    <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
                                            <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                                                <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                                                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                            </div>
                                            <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                                <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                            </div>
                                            <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
                                                <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                                <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                                            </div>
                                        </div>
                                    </div>
                                    <span className="block w-full p-2 text-center font-normal">Light</span>
                                </Label>
                            </div>

                            {/* Dark */}
                            <div className="items-center">
                                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                                <Label htmlFor="dark" className="cursor-pointer">
                                    <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <div className="space-y-2 rounded-sm bg-slate-950 p-2">
                                            <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                                <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                                                <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                            </div>
                                            <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                                <div className="h-4 w-4 rounded-full bg-slate-400" />
                                                <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                            </div>
                                            <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
                                                <div className="h-4 w-4 rounded-full bg-slate-400" />
                                                <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                    <span className="block w-full p-2 text-center font-normal">Dark</span>
                                </Label>
                            </div>

                            {/* System */}
                            <div className="items-center">
                                <RadioGroupItem value="system" id="system" className="peer sr-only" />
                                <Label htmlFor="system" className="cursor-pointer">
                                    <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <div className="space-y-2 rounded-sm overflow-hidden p-2" style={{ background: 'linear-gradient(135deg, #ecedef 50%, #1e293b 50%)' }}>
                                            <div className="space-y-2 rounded-md p-2 shadow-sm" style={{ background: 'linear-gradient(135deg, #ffffff 50%, #334155 50%)' }}>
                                                <div className="h-2 w-20 rounded-lg bg-[#ecedef]" />
                                                <div className="h-2 w-25 rounded-lg bg-[#ecedef]" />
                                            </div>
                                            <div className="flex items-center space-x-2 rounded-md p-2 shadow-sm" style={{ background: 'linear-gradient(135deg, #ffffff 50%, #334155 50%)' }}>
                                                <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                                <div className="h-2 w-25 rounded-lg bg-[#ecedef]" />
                                            </div>
                                            <div className="flex items-center space-x-2 rounded-md p-2 shadow-sm" style={{ background: 'linear-gradient(135deg, #ffffff 50%, #334155 50%)' }}>
                                                <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
                                                <div className="h-2 w-25 rounded-lg bg-[#ecedef]" />
                                            </div>
                                        </div>
                                    </div>
                                    <span className="block w-full p-2 text-center font-normal">System</span>
                                </Label>
                            </div>
                        </RadioGroup>
                        <p className="text-sm text-muted-foreground mt-2">
                            Your preference is saved and applied on every visit.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

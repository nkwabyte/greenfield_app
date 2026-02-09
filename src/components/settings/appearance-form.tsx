'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function AppearanceForm() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                    Customize the appearance of the application. Automatically switch between day and night themes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Theme</Label>
                        <RadioGroup defaultValue="light" className="grid max-w-md grid-cols-2 gap-8 pt-2">
                            <div className="items-center">
                                <RadioGroupItem value="light" id="light" className="peer sr-only" />
                                <Label
                                    htmlFor="light"
                                    className="cursor-pointer"
                                >
                                    <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent peer-data-[state=checked]:border-primary">
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
                                    <span className="block w-full p-2 text-center font-normal">
                                        Light
                                    </span>
                                </Label>
                            </div>
                            <div className="items-center">
                                <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                                <Label
                                    htmlFor="dark"
                                    className="cursor-pointer"
                                >
                                    <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent peer-data-[state=checked]:border-primary">
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
                                    <span className="block w-full p-2 text-center font-normal">
                                        Dark
                                    </span>
                                </Label>
                            </div>
                        </RadioGroup>
                        <p className="text-sm text-muted-foreground mt-2">
                            * Theme switching is currently a preview and will be fully enabled in a future update.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

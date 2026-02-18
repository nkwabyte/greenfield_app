'use client';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { AiAssistant } from '@/components/ai-assistant';
import {
    useFarmers,
    useEmployees,
    useProducts,
    useSuppliers,
    useTransactions,
} from '@/hooks/useData';

export default function AiInsightsPage() {
    const farmers = useFarmers() ?? [];
    const employees = useEmployees() ?? [];
    const products = useProducts() ?? [];
    const suppliers = useSuppliers() ?? [];
    const transactions = useTransactions() ?? [];

    return (
        <AppShell>
            <PageHeader
                title="AI Insights"
                description="Get real-time business insights and analytics from your data."
            />
            <div className="p-6 h-[calc(100vh-10rem)]">
                <AiAssistant
                    farmers={farmers}
                    employees={employees}
                    products={products}
                    suppliers={suppliers}
                    transactions={transactions}
                />
            </div>
        </AppShell>
    );
}

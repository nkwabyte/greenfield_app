'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { models } from '@/lib/model_options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot, Send, BarChart2, Lightbulb, UserCheck, Package, DollarSign,
  PanelLeftClose, PanelLeftOpen, Plus, Trash2, MessageSquare, Download, Users
} from 'lucide-react';
import type { Farmer, Employee, Product, Supplier, Transaction } from '@/lib/types';
import { runChatWithContext } from '@/lib/ai-actions';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type AiAssistantProps = {
  farmers: Farmer[];
  employees?: Employee[];
  products?: Product[];
  suppliers?: Supplier[];
  transactions?: Transaction[];
};

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
};

type PromptCard = {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  description: string;
  prompt: string;
};

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'ai_chat_sessions';

function loadSessionsFromStorage(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessionsToStorage(sessions: ChatSession[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // quota exceeded — silently ignore
  }
}

function generateId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Prompt Cards ─────────────────────────────────────────────────────────────

function buildPromptCards(): PromptCard[] {
  return [
    {
      icon: BarChart2,
      iconColor: 'group-hover:text-white text-blue-500',
      title: 'KPI Dashboard',
      description: 'Key performance metrics, regional breakdowns, and business health summary',
      prompt: `Generate a comprehensive KPI dashboard report for our agricultural CRM using the data context provided. Format the response in Markdown with the following sections:

1. Executive Summary — 3 to 4 sentences summarising overall business health
2. Key Metrics Table — columns: Metric | Value | Status (use [Good] / [Warning] / [Critical] for status)
3. Regional Distribution — a bar chart using block characters showing farmer count per region with percentages
4. Gender Distribution — a bar showing Male vs Female split with percentages
5. Farm Size Analysis — average, minimum, maximum, and a brief distribution note
6. Workforce Overview — total employees, breakdown by role and status
7. Inventory Snapshot — product count by category, total stock units, low-stock items
8. Financial Summary — total income, total expenses, net balance
9. Top 3 Recommendations — numbered, each tied to a specific data point

Do not use emojis or decorative characters. Use plain Markdown tables and block-character bar charts only.`,
    },
    {
      icon: Lightbulb,
      iconColor: 'group-hover:text-white text-yellow-500',
      title: 'Business Recommendations',
      description: 'Data-driven strategic recommendations ranked by priority and impact',
      prompt: `Based on the CRM data provided, produce a structured business recommendations report in Markdown:

1. Situation Analysis — 2 to 3 sentences on the current state of the business
2. Priority Recommendations — a table with columns: Priority | Recommendation | Expected Impact | Effort | Timeline
   - Priority levels: High / Medium / Low
   - Include at least 5 recommendations grounded in the data
3. Regional Growth Opportunities — identify regions with the most potential and explain why using the data
4. Gender Inclusion — specific, measurable actions to increase female farmer participation
5. Operational Efficiency — employee-to-farmer ratio analysis and staffing suggestions
6. Supply Chain — product and supplier diversification recommendations
7. Immediate Actions — 3 actions that can be taken this week
8. 90-Day Roadmap — a table: Week 1-2 | Week 3-4 | Month 2 | Month 3

Do not use emojis. Every recommendation must reference a specific number from the data.`,
    },
    {
      icon: UserCheck,
      iconColor: 'group-hover:text-white text-green-500',
      title: 'Farmer Profile Analysis',
      description: 'Composite profile of the typical farmer based on CRM data',
      prompt: `Using the CRM data provided, produce a detailed composite farmer profile report in Markdown:

1. Profile Summary Table — columns: Attribute | Detail, covering: typical age range, dominant gender, most common region, average farm size, top crops grown, most common society type
2. Behavioural Profile — subsections for: Goals, Challenges, Motivations, Preferred Communication
3. Demographic Breakdown — a Markdown table showing distribution by region, gender, and farm size band
4. Typical Farmer Description — a 3 to 4 sentence narrative describing a representative farmer based on the data
5. Engagement Recommendations — how to best reach and support this farmer profile
6. Underserved Segments — identify 2 to 3 groups that are underrepresented and could be targeted for growth

Do not use emojis or decorative symbols. Use plain Markdown only.`,
    },
    {
      icon: Package,
      iconColor: 'group-hover:text-white text-purple-500',
      title: 'Inventory and Supply Chain',
      description: 'Stock levels, supplier analysis, and procurement priorities',
      prompt: `Analyse the inventory and supply chain data from the CRM context and produce a report in Markdown:

1. Inventory Overview — total products, total suppliers, average products per supplier
2. Stock Status by Category — a table with columns: Category | Product Count | Total Units | Status ([OK] / [Low] / [Critical])
3. Supplier Concentration — identify over-reliance on any single supplier; show a bar chart of products per supplier
4. Category Distribution — a block-character bar chart of product count per category
5. Low Stock Items — list all products with fewer than 10 units in stock
6. Supplier Performance — rank suppliers by product variety provided
7. Supply Chain Recommendations — 3 to 5 specific actions to improve inventory health
8. Procurement Priorities — what to source in the next 30 days based on current stock

Do not use emojis. Use plain Markdown tables and block-character charts only.`,
    },
    {
      icon: DollarSign,
      iconColor: 'group-hover:text-white text-emerald-500',
      title: 'Financial Overview',
      description: 'Income, expenses, net balance, and financial health analysis',
      prompt: `Produce a comprehensive financial overview from the transaction data in the CRM context. Format in Markdown:

1. Financial Summary — a table with columns: Metric | Amount | Note, covering: Total Income, Total Expenses, Net Balance, Transaction Count
2. Income vs Expenses — a block-character bar chart comparing the two totals
3. Breakdown by Category — a table showing each transaction category, total amount, and percentage of its type (Income or Expense)
4. Cash Flow Trend — describe the trend based on transaction dates (improving, declining, stable)
5. Top Expense Categories — ranked list with GHS amount and percentage of total expenses
6. Top Income Sources — ranked list with GHS amount and percentage of total income
7. Financial Health Assessment — a brief paragraph rating overall financial health with specific justification from the numbers
8. Recommendations — 3 to 5 specific actions to improve financial performance

Do not use emojis. Use GHS as the currency. All figures must come from the data context.`,
    },
    {
      icon: Users,
      iconColor: 'group-hover:text-white text-pink-500',
      title: 'Demographics & Inclusion',
      description: 'Women\'s participation metrics and overall demographic breakdowns',
      prompt: `Analyse the demographic data from the CRM context, focusing heavily on inclusion, and produce a report in Markdown:

1. Overall Gender Split — total male vs female farmers with percentages
2. Women's Participation by Region — a table showing regions ranked by number of female farmers
3. Women in Leadership — if group position data is available, summarize how many women hold leadership roles (e.g. Secretary, Treasurer)
4. Age Demographics — a block-character bar chart showing age bands (18-30, 31-45, 46-60, 60+)
5. Inclusion Recommendations — 3 to 5 specific, measurable actions to increase female and youth participation over the next quarter

Do not use emojis. Ensure all tables are properly formatted in plain Markdown.`,
    },
    {
      icon: Package,
      iconColor: 'group-hover:text-white text-indigo-500',
      title: 'Inputs & Loans Analysis',
      description: 'Breakdown of inputs requested, loan values, deposit payments, and outstanding balances',
      prompt: `Analyse the farmer requests, input distributions, and financial data from the CRM context. Produce a comprehensive report in Markdown:

1. Input Requests Overview — total farmers requesting inputs, total items requested, most popular items
2. Loan Value Breakdown — a table showing total loan value, deposit payments made, and outstanding balance per region
3. High-Risk Accounts — list any regions or specific groups with the highest outstanding balances
4. Collection Rate — percentage of total loan value that has been collected via deposits
5. Deposit Payment Trends — describe the trend of payments (e.g. mostly upfront vs ongoing)
6. Strategic Recommendations — 3 actions to improve loan recovery and streamline future input distribution

Do not use emojis. Use GHS as the currency. Use plain Markdown tables only.`,
    },
    {
      icon: Users,
      iconColor: 'group-hover:text-white text-cyan-500',
      title: 'Male Farmers by Group, District & Region',
      description: 'Count and distribution of male farmers broken down by group, district, and region',
      prompt: `Using the CRM farmer data, produce a detailed breakdown of male farmers by organisational and geographical unit. Format the report in Markdown:

1. Overall Male Farmer Count — total male farmers and their percentage of the overall farmer population
2. Male Farmers by Region — a Markdown table sorted descending by count: Region | Male Farmers | % of Region Total | % of All Males
3. Male Farmers by District — a Markdown table (top 20 districts) sorted descending: District | Region | Male Farmers | % of District Total
4. Male Farmers by Group/Society — a Markdown table (top 20 groups) sorted descending: Group | District | Region | Male Farmers | % of Group Total
5. Gender Balance Heat-Map — for each region, show a text bar representing male vs female split (e.g. [■■■■■■■░░░] 70% M / 30% F)
6. Districts with Highest Male Concentration — top 10 districts where males exceed 70% of farmers, with exact percentage
7. Groups with Highest Male Concentration — top 10 groups by male percentage with exact counts
8. Inclusion Observations — 2 to 3 sentences noting where male dominance is most pronounced and what that implies for outreach
9. Recommendations — 3 specific, data-grounded actions to improve gender balance in the highest male-concentrated areas

Do not use emojis. All figures must come from the data context. Use plain Markdown tables only.`,
    },
  ];
}


// ─── Component ────────────────────────────────────────────────────────────────

export function AiAssistant({
  farmers,
  employees = [],
  products = [],
  suppliers = [],
  transactions = [],
}: AiAssistantProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const router = useRouter();
  const apiKey = user?.geminiApiKey;
  const [showKeyAlert, setShowKeyAlert] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<string>(
    user?.preferredModel || 'models/gemini-2.5-flash'
  );

  React.useEffect(() => {
    if (user?.preferredModel) setSelectedModel(user.preferredModel);
  }, [user?.preferredModel]);

  React.useEffect(() => {
    if (!apiKey) setShowKeyAlert(true);
  }, [apiKey]);

  // ── Session state ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Load sessions from localStorage on mount
  React.useEffect(() => {
    const saved = loadSessionsFromStorage();
    setSessions(saved);
  }, []);

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState('');
  const [chatLoading, setChatLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ── Session helpers ────────────────────────────────────────────────────────

  const persistSessions = React.useCallback((updated: ChatSession[]) => {
    setSessions(updated);
    saveSessionsToStorage(updated);
  }, []);

  const startNewChat = React.useCallback(() => {
    setChatMessages([]);
    setChatInput('');
    setActiveSessionId(null);
  }, []);

  const loadSession = React.useCallback((session: ChatSession) => {
    setChatMessages(session.messages);
    setActiveSessionId(session.id);
    setChatInput('');
  }, []);

  const deleteSession = React.useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    persistSessions(updated);
    if (activeSessionId === id) {
      setChatMessages([]);
      setActiveSessionId(null);
    }
  }, [sessions, activeSessionId, persistSessions]);

  // ── Context summary ────────────────────────────────────────────────────────

  const getContextSummary = React.useCallback(() => {
    const total = farmers.length;

    const byRegion = farmers.reduce((acc, f) => {
      if (f.region) acc[f.region] = (acc[f.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byDistrict = farmers.reduce((acc, f) => {
      if (f.district) acc[f.district] = (acc[f.district] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySociety = farmers.reduce((acc, f) => {
      if (f.society) acc[f.society] = (acc[f.society] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const male = farmers.filter(f => f.gender === 'Male').length;
    const female = farmers.filter(f => f.gender === 'Female').length;
    const other = farmers.filter(f => f.gender === 'Other').length;

    const byEducation = farmers.reduce((acc, f) => {
      const lvl = f.educationLevel || 'Unknown';
      acc[lvl] = (acc[lvl] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = farmers.reduce((acc, f) => {
      const s = f.status || 'Unknown';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const farmSizes = farmers.map(f => Number(f.farmSize) || 0).filter(s => s > 0);
    const avgFarmSize = farmSizes.length ? farmSizes.reduce((a, b) => a + b, 0) / farmSizes.length : 0;
    const minFarmSize = farmSizes.length ? Math.min(...farmSizes) : 0;
    const maxFarmSize = farmSizes.length ? Math.max(...farmSizes) : 0;

    const cropFreq = farmers.flatMap(f => f.cropsGrown || []).reduce((acc, c) => {
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topCrops = Object.entries(cropFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const ages = farmers.map(f => Number(f.age) || 0).filter(a => a > 0);
    const avgAge = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;

    const empByRole = employees.reduce((acc, e) => {
      acc[e.role] = (acc[e.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const empByStatus = employees.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const salaries = employees.map(e => Number(e.salary) || 0).filter(s => s > 0);
    const totalSalary = salaries.reduce((a, b) => a + b, 0);
    const avgSalary = salaries.length ? totalSalary / salaries.length : 0;

    const prodByCategory = products.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalStock = products.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
    const totalInventoryValue = products.reduce((s, p) => s + (Number(p.quantity) || 0) * (Number(p.price) || 0), 0);
    const lowStockProducts = products.filter(p => (Number(p.quantity) || 0) < 10);
    const productDetails = products.slice(0, 50).map(p => {
      const supplier = suppliers.find(s => s.id === p.supplierId);
      return `  - ${p.name} (${p.category}): qty=${p.quantity}, price=GHS ${p.price}${supplier ? `, supplier=${supplier.name}` : ''}`;
    });

    const supplierProductCount = suppliers.map(s => ({
      name: s.name,
      count: products.filter(p => p.supplierId === s.id).length,
    })).sort((a, b) => b.count - a.count);

    const income = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expenses = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const byCategory = transactions.reduce((acc, t) => {
      const key = `${t.type}:${t.category}`;
      acc[key] = (acc[key] || 0) + (Number(t.amount) || 0);
      return acc;
    }, {} as Record<string, number>);
    const recentTx = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
      .map(t => `  - [${t.date}] ${t.type} | ${t.category} | GHS ${t.amount} | ${t.description}`);

    return [
      `=== GREENFIELD CAPITAL CRM — FULL DATA CONTEXT ===`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `── FARMERS (${total} total) ──`,
      `  Gender: Male=${male}, Female=${female}, Other=${other}`,
      `  Status: ${Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      `  Avg Age: ${avgAge.toFixed(1)} yrs`,
      `  Farm Size: avg=${avgFarmSize.toFixed(2)} acres, min=${minFarmSize}, max=${maxFarmSize}`,
      `  By Region: ${Object.entries(byRegion).sort((a, b) => b[1] - a[1]).map(([r, c]) => `${r}=${c}`).join(', ')}`,
      `  By District (top 10): ${Object.entries(byDistrict).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([d, c]) => `${d}=${c}`).join(', ')}`,
      `  By Society (top 10): ${Object.entries(bySociety).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s, c]) => `${s}=${c}`).join(', ')}`,
      `  Education: ${Object.entries(byEducation).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      `  Top Crops: ${topCrops.map(([c, n]) => `${c}(${n})`).join(', ')}`,
      ``,
      `── EMPLOYEES (${employees.length} total) ──`,
      `  By Role: ${Object.entries(empByRole).map(([r, c]) => `${r}=${c}`).join(', ')}`,
      `  By Status: ${Object.entries(empByStatus).map(([s, c]) => `${s}=${c}`).join(', ')}`,
      `  Salary: total=GHS ${totalSalary.toLocaleString()}, avg=GHS ${avgSalary.toFixed(0)}/mo`,
      ``,
      `── PRODUCTS (${products.length} total) ──`,
      `  By Category: ${Object.entries(prodByCategory).map(([c, n]) => `${c}=${n}`).join(', ')}`,
      `  Total Stock Units: ${totalStock.toLocaleString()}`,
      `  Total Inventory Value: GHS ${totalInventoryValue.toLocaleString()}`,
      `  Low Stock (<10 units): ${lowStockProducts.length} products${lowStockProducts.length ? ` — ${lowStockProducts.map(p => p.name).join(', ')}` : ''}`,
      `  Product Details (up to 50):`,
      ...productDetails,
      ``,
      `── SUPPLIERS (${suppliers.length} total) ──`,
      ...supplierProductCount.map(s => `  - ${s.name}: ${s.count} products`),
      ``,
      `── TRANSACTIONS (${transactions.length} total) ──`,
      `  Total Income:   GHS ${income.toLocaleString()}`,
      `  Total Expenses: GHS ${expenses.toLocaleString()}`,
      `  Net Balance:    GHS ${(income - expenses).toLocaleString()}`,
      `  By Category:`,
      ...Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => `    ${k}: GHS ${v.toLocaleString()}`),
      `  Recent 10 Transactions:`,
      ...recentTx,
    ].join('\n');
  }, [farmers, employees, products, suppliers, transactions]);

  // ── Send message ───────────────────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!apiKey) { setShowKeyAlert(true); return; }

    const userMsg: ChatMessage = { role: 'user', text };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    // Create session on first message
    let sessionId = activeSessionId;
    let currentSessions = sessions;
    if (!sessionId) {
      sessionId = generateId();
      const newSession: ChatSession = {
        id: sessionId,
        title: text.slice(0, 50),
        createdAt: new Date().toISOString(),
        messages: updatedMessages,
      };
      currentSessions = [newSession, ...sessions];
      persistSessions(currentSessions);
      setActiveSessionId(sessionId);
    }

    try {
      const history = chatMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const responseText = await runChatWithContext({
        message: text,
        context: getContextSummary(),
        history,
        apiKey,
        modelName: selectedModel,
      });
      const finalMessages: ChatMessage[] = [...updatedMessages, { role: 'model', text: responseText }];
      setChatMessages(finalMessages);

      // Persist updated messages to the session
      const updatedSessions = currentSessions.map(s =>
        s.id === sessionId ? { ...s, messages: finalMessages } : s
      );
      persistSessions(updatedSessions);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessages: ChatMessage[] = [
        ...updatedMessages,
        { role: 'model', text: 'An error occurred. Please check your API key and try again.' },
      ];
      setChatMessages(errorMessages);
      const updatedSessions = currentSessions.map(s =>
        s.id === sessionId ? { ...s, messages: errorMessages } : s
      );
      persistSessions(updatedSessions);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(chatInput);
  };

  const handlePromptCard = (prompt: string) => {
    sendMessage(prompt);
  };

  const promptCards = React.useMemo(() => buildPromptCards(), []);
  const isEmpty = chatMessages.length === 0;

  const handleExportMessage = (text: string, index: number) => {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Insight_Report_${index}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full bg-background rounded-lg border shadow-sm overflow-hidden">

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div className="w-64 shrink-0 flex flex-col border-r bg-muted/20">
          {/* Sidebar header */}
          <div className="px-3 py-3 border-b flex items-center justify-between shrink-0">
            <span className="text-sm font-semibold text-foreground">Chat History</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSidebarOpen(false)}
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          {/* New Chat button */}
          <div className="px-3 py-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs"
              onClick={startNewChat}
            >
              <Plus className="h-3.5 w-3.5" />
              New Chat
            </Button>
          </div>

          {/* Session list */}
          <ScrollArea className="flex-1 px-2 pb-2">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No chat history yet.</p>
                <p className="text-xs text-muted-foreground">Start a conversation to see it here.</p>
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session)}
                    className={`group w-full text-left rounded-lg px-3 py-2.5 transition-colors relative ${activeSessionId === session.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground'
                      }`}
                  >
                    <p className="text-xs font-medium leading-snug line-clamp-2 pr-5">
                      {session.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatRelativeTime(session.createdAt)}
                      {' · '}
                      {Math.ceil(session.messages.length / 2)} msg{session.messages.length !== 2 ? 's' : ''}
                    </p>
                    {/* Delete button */}
                    <span
                      onClick={(e) => deleteSession(session.id, e)}
                      className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      title="Delete session"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* ── Chat pane ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            )}
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">AI Assistant</h2>
          </div>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-50 h-8 text-xs">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {models
                .filter(
                  m =>
                    !m.name.includes('imagen') &&
                    !m.name.includes('veo') &&
                    !m.name.includes('audio') &&
                    !m.name.includes('embedding') &&
                    !m.name.includes('aqa') &&
                    !m.name.includes('face') &&
                    !m.name.includes('preview-image')
                )
                .map(model => (
                  <SelectItem key={model.name} value={model.name} className="text-xs">
                    {model.displayName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Chat history */}
        <ScrollArea className="flex-1 px-4 py-4" ref={scrollAreaRef}>
          {isEmpty ? (
            /* Empty state — welcome + prompt cards */
            <div className="flex flex-col items-center justify-center h-full min-h-75 gap-6 py-8">
              <div className="text-center space-y-1">
                <Bot className="h-12 w-12 mx-auto text-primary/30" />
                <p className="text-lg font-semibold text-foreground">What would you like to explore?</p>
                <p className="text-sm text-muted-foreground">
                  Click a card below or type your own question.
                </p>
              </div>

              {/* Prompt cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl">
                {promptCards.map(card => (
                  <button
                    key={card.title}
                    onClick={() => handlePromptCard(card.prompt)}
                    disabled={chatLoading}
                    className="group text-left rounded-xl border bg-card hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:border-emerald-500 transition-all duration-200 p-4 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="p-1.5 rounded-lg bg-muted group-hover:bg-white/20 transition-colors">
                        <card.icon className={cn("h-5 w-5 transition-colors", card.iconColor)} />
                      </span>
                      <span className="font-semibold text-sm group-hover:text-white transition-colors">{card.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground group-hover:text-emerald-50 leading-relaxed transition-colors">{card.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="group relative max-w-[85%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm border shadow-sm ${msg.role === 'user'
                        ? 'bg-black text-white rounded-br-sm border-black dark:bg-white dark:text-black dark:border-white'
                        : 'bg-white text-black rounded-bl-sm border-border dark:bg-zinc-950 dark:text-white'
                        }`}
                    >
                      <div className={`prose prose-sm max-w-none wrap-break-word [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>table]:text-xs [&>pre]:text-xs [&>pre]:overflow-x-auto ${msg.role === 'user' ? 'prose-invert dark:prose-neutral' : 'dark:prose-invert'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Export button for AI messages */}
                    {msg.role === 'model' && (
                      <button
                        onClick={() => handleExportMessage(msg.text, i)}
                        className="absolute -right-10 top-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="Export as Markdown"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-950 border border-border shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce" />
                    <span className="h-2 w-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="h-2 w-2 bg-black/40 dark:bg-white/40 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input bar */}
        <div className="px-4 py-3 border-t shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask anything about your farmers, inventory, finances…"
              disabled={chatLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* ── API Key Alert ── */}
      <AlertDialog
        open={showKeyAlert}
        onOpenChange={(open) => {
          setShowKeyAlert(open);
          if (!open) {
            router.push('/dashboard');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gemini API Key Required</AlertDialogTitle>
            <AlertDialogDescription>
              To use AI features, you need to provide your own Google Gemini API Key.
              <br /><br />
              1. Get a key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline text-primary">
                Google AI Studio
              </a>.
              <br />
              2. Go to Settings &gt; Profile to save it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/settings">Go to Settings</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

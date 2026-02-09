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
} from "@/components/ui/select";
import { models } from '@/lib/model_options';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Lightbulb, UserCheck, BarChart, MessageSquare, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { Farmer } from '@/lib/types';
import {
  runSummarizeKpis,
  runSuggestBusinessDecisions,
  runGenerateFarmerPersona,
  runChatWithContext,
} from '@/lib/ai-actions';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import Link from 'next/link';

type AiAssistantProps = {
  farmers: Farmer[];
};

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

type ChatMessage = {
  role: 'user' | 'model';
  text: string;
};

export function AiAssistant({ farmers }: AiAssistantProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const apiKey = user?.geminiApiKey;
  const [showKeyAlert, setShowKeyAlert] = React.useState(false);

  // Tabs
  const [activeTab, setActiveTab] = React.useState('chat');
  const [selectedModel, setSelectedModel] = React.useState<string>(user?.preferredModel || 'models/gemini-2.5-flash');

  // Update selected model when user preference changes
  React.useEffect(() => {
    if (user?.preferredModel) {
      setSelectedModel(user.preferredModel);
    }
  }, [user?.preferredModel]);

  // Chat State
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = React.useState('');
  const [chatLoading, setChatLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Insight States
  const [kpiInsights, setKpiInsights] = React.useState<any>(null);
  const [kpiLoading, setKpiLoading] = React.useState<LoadingState>('idle');

  const [decisions, setDecisions] = React.useState<any>(null);
  const [decisionsLoading, setDecisionsLoading] = React.useState<LoadingState>('idle');

  const [persona, setPersona] = React.useState<any>(null);
  const [personaLoading, setPersonaLoading] = React.useState<LoadingState>('idle');

  // Check for API Key on mount
  React.useEffect(() => {
    if (!apiKey) {
      // Don't show alert immediately on mount for page view, 
      // maybe only if they try to interact? 
      // Or show it if they are on this page?
      // Let's stick to showing it if they try to interact for now, 
      // but the original logic was "onOpen". 
      // Since it's a page now, let's just show it if it's missing.
      setShowKeyAlert(true);
    }
  }, [apiKey]);

  // Scroll to bottom of chat
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab]);

  const getFarmerDataSummary = React.useCallback(() => {
    const total = farmers.length;
    const regions = farmers.reduce((acc, f) => {
      if (f.region) acc[f.region] = (acc[f.region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const genderCounts = {
      male: farmers.filter(f => f.gender === 'Male').length,
      female: farmers.filter(f => f.gender === 'Female').length,
    };

    const crops = new Set(farmers.flatMap(f => f.cropsGrown || []));
    const avgFarmSize =
      farmers.reduce((sum, f) => sum + (Number(f.farmSize) || 0), 0) / (total || 1);

    const sample = farmers.find(f => f.name && f.community);

    const summary = [
      `Total farmers: ${total}`,
      `Regions: ${Object.keys(regions).join(', ')}`,
      `Gender ratio - Male: ${genderCounts.male}, Female: ${genderCounts.female}`,
      `Avg farm size: ${avgFarmSize.toFixed(2)} acres`,
      `Common crops: ${Array.from(crops).slice(0, 5).join(', ')}`,
      sample
        ? `Sample: ${sample.name} from ${sample.community}, ${sample.region} with ${sample.farmSize} acres.`
        : 'No sample available.',
    ];

    return summary.join('\n');
  }, [farmers]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    if (!apiKey) {
      setShowKeyAlert(true);
      return;
    }

    const newUserMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const history = chatMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const context = getFarmerDataSummary();

      const responseText = await runChatWithContext({
        message: newUserMsg.text,
        context,
        history,
        apiKey,
        modelName: selectedModel
      });

      setChatMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please check your API key and try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSummarizeKpis = async () => {
    if (!apiKey) { setShowKeyAlert(true); return; }
    setKpiLoading('loading');
    try {
      const regionalCounts = farmers.reduce((acc, f) => {
        if (f.region) acc[f.region] = (acc[f.region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const male = farmers.filter(f => f.gender === 'Male').length;
      const female = farmers.filter(f => f.gender === 'Female').length;
      const totalWithGender = male + female;

      const result = await runSummarizeKpis({
        totalFarmers: farmers.length,
        regionalCounts,
        genderRatios: {
          male: totalWithGender > 0 ? (male / totalWithGender) * 100 : 0,
          female: totalWithGender > 0 ? (female / totalWithGender) * 100 : 0,
        },
        apiKey,
        modelName: selectedModel
      });

      setKpiInsights(result);
      setKpiLoading('success');
    } catch (e) {
      console.error(e);
      setKpiLoading('error');
    }
  };

  const handleSuggestDecisions = async () => {
    if (!apiKey) { setShowKeyAlert(true); return; }
    setDecisionsLoading('loading');
    try {
      const result = await runSuggestBusinessDecisions({
        farmerDataSummary: getFarmerDataSummary(),
        inventoryDataSummary:
          'Inventory data is currently unavailable. Focus decisions on farmer distribution, gender balance, and farm size.',
        apiKey,
        modelName: selectedModel
      });
      setDecisions(result);
      setDecisionsLoading('success');
    } catch (e) {
      console.error(e);
      setDecisionsLoading('error');
    }
  };

  const handleGeneratePersona = async () => {
    if (!apiKey) { setShowKeyAlert(true); return; }
    setPersonaLoading('loading');
    try {
      const result = await runGenerateFarmerPersona({
        farmerDataSummary: getFarmerDataSummary(),
        apiKey,
        modelName: selectedModel
      });
      setPersona(result);
      setPersonaLoading('success');
    } catch (e) {
      console.error(e);
      setPersonaLoading('error');
    }
  };

  const renderContent = (
    loading: LoadingState,
    data: any,
    generator: () => void,
    idleText: string,
    resultRenderer: () => React.ReactNode
  ) => {
    if (loading === 'loading') {
      return (
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      );
    }
    if (loading === 'success' && data) {
      return <div className="pt-4">{resultRenderer()}</div>;
    }
    if (loading === 'error') {
      return <p className="pt-4 text-destructive">Could not generate insights. Please check your API key.</p>;
    }
    return (
      <div className="flex flex-col items-center justify-center space-y-4 pt-8 text-center min-h-[200px]">
        <p className="text-muted-foreground">{idleText}</p>
        <Button onClick={generator}>Generate Now</Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border shadow-sm">
      <div className="p-4 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> AI Assistant
          </h2>
          <p className="text-sm text-muted-foreground">Using {
            models.find(m => m.name === selectedModel)?.displayName || selectedModel
          }</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">
              <MessageSquare className="mr-2 h-4 w-4" />Chat
            </TabsTrigger>
            <TabsTrigger value="kpi">
              <BarChart className="mr-2 h-4 w-4" />KPIs
            </TabsTrigger>
            <TabsTrigger value="decisions">
              <Lightbulb className="mr-2 h-4 w-4" />Suggestions
            </TabsTrigger>
            <TabsTrigger value="persona">
              <UserCheck className="mr-2 h-4 w-4" />Persona
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden p-4 pt-2 data-[state=inactive]:hidden">
          <div className="flex justify-end pb-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {models
                  .filter(m => !m.name.includes('imagen') && !m.name.includes('veo') && !m.name.includes('audio') && !m.name.includes('embedding') && !m.name.includes('aqa') && !m.name.includes('face') && !m.name.includes('preview-image'))
                  .map((model) => (
                    <SelectItem key={model.name} value={model.name} className="text-xs">
                      {model.displayName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                  <Bot className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Ask me anything about your farmers, crops, or regions.</p>
                  <p className="text-xs mt-2">Example: &quot;How many female farmers do we have in Keyabi?&quot;</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted max-w-[80%] rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                    <div className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce" />
                    <div className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="h-2 w-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="pt-4 mt-auto">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex items-center gap-2"
            >
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type your message..."
                disabled={chatLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="kpi" className="flex-1 overflow-auto p-4 data-[state=inactive]:hidden">
          {renderContent(
            kpiLoading,
            kpiInsights,
            handleSummarizeKpis,
            'Summarize key performance indicators to quickly understand trends.',
            () => (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-semibold">Summary</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{kpiInsights?.summary}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">Recommendations</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{kpiInsights?.recommendations}</p>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        <TabsContent value="decisions" className="flex-1 overflow-auto p-4 data-[state=inactive]:hidden">
          {renderContent(
            decisionsLoading,
            decisions,
            handleSuggestDecisions,
            'Get data-driven business decisions for optimization.',
            () => (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{decisions?.suggestedDecisions}</p>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        <TabsContent value="persona" className="flex-1 overflow-auto p-4 data-[state=inactive]:hidden">
          {renderContent(
            personaLoading,
            persona,
            handleGeneratePersona,
            'Generate a representative farmer persona from your CRM data.',
            () => (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-semibold">{persona?.personaName}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{persona?.personaDescription}</p>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showKeyAlert} onOpenChange={setShowKeyAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gemini API Key Required</AlertDialogTitle>
            <AlertDialogDescription>
              To use AI features, you need to provide your own Google Gemini API Key.
              <br /><br />
              1. Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline text-primary">Google AI Studio</a>.
              <br />
              2. Go to Settings {'>'} Profile to save it.
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

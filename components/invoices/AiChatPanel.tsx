
import React, { useState, useEffect } from 'react';
import { generateTextResponse } from '../../services/geminiService';
import { generateTextResponseLocal, testOllamaConnection } from '../../services/ollamaService';
import { SettingsIcon, MessageSquare, Send, Loader2, AlertCircle, CloudLightning, AlertTriangle } from './Icons';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ReceivedGood, FinishedGood, WIPItem, ExtractedInvoice } from '../../types';
import { supabase } from '../../supabaseClient';
import { useLocalStorage } from '../../hooks/useLocalStorage';

type AIProvider = 'gemini' | 'ollama';

interface AiChatPanelProps {
    currentUser: { username: string } | null;
    receivedGoods: ReceivedGood[];
    finishedGoods: FinishedGood[];
    wipItems: WIPItem[];
}

const AiChatPanel: React.FC<AiChatPanelProps> = ({ currentUser, receivedGoods, finishedGoods, wipItems }) => {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [invoices, setInvoices] = useState<ExtractedInvoice[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [testStatus, setTestStatus] = useState<{success?: boolean; message?: string} | null>(null);

    // AI Settings - Persisted with Env Var Fallbacks
    const [aiProvider, setAiProvider] = useLocalStorage<AIProvider>('ai_provider', 'ollama');
    
    // Safely get env vars or use defaults
    const getEnv = (key: string, fallback: string) => (import.meta as any).env?.[key] || fallback;
    
    const defaultUrl = getEnv('VITE_OLLAMA_URL', 'http://localhost:11434');
    const defaultModel = getEnv('VITE_OLLAMA_MODEL', 'qwen3-vl:235b-cloud');
    const defaultKey = getEnv('VITE_OLLAMA_API_KEY', 'd548b1ef316b42cb99b055044c0875b8.AG6A9VHxF-JNyvn1rgmGaeWF');

    const [localModelUrl, setLocalModelUrl] = useLocalStorage<string>('ai_local_url', defaultUrl);
    const [localModelName, setLocalModelName] = useLocalStorage<string>('ai_local_model', defaultModel);
    const [localApiKey, setLocalApiKey] = useLocalStorage<string>('ai_local_key', defaultKey);

    // Helper: Check for Mixed Content
    const isMixedContent = window.location.protocol === 'https:' && localModelUrl.startsWith('http:');

    // Fetch invoices for context
    useEffect(() => {
        const fetchInvoices = async () => {
            const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(20);
            if (data) setInvoices(data as ExtractedInvoice[]);
        };
        fetchInvoices();
    }, []);

    const handleTestConnection = async () => {
        setTestStatus({ message: 'Testing connection...' });
        const result = await testOllamaConnection(localModelUrl, localApiKey);
        setTestStatus(result);
    };

    const buildSystemContext = () => {
        const rawStockSummary = receivedGoods.slice(0, 10).map(g => `${g.name} (${g.quantity})`).join(', ');
        const finishedStockSummary = finishedGoods.slice(0, 10).map(g => `Batch ${g.id} (${g.quantity} units)`).join(', ');
        const recentSales = invoices.filter(i => i.source_type === 'sales').slice(0, 5).map(i => `Inv #${i.invoice_metadata.invoice_number}: ₹${i.totals.grand_total}`).join(', ');
        const recentPurchases = invoices.filter(i => i.source_type === 'purchase').slice(0, 5).map(i => `Inv #${i.invoice_metadata.invoice_number} from ${i.issuer_details.name}: ₹${i.totals.grand_total}`).join(', ');

        return `
        SYSTEM CONTEXT (Datlion Cnergy Pvt. Ltd.):
        - Current User: ${currentUser?.username}
        - Raw Materials (Top 10): ${rawStockSummary || 'None'}
        - Finished Goods (Top 10): ${finishedStockSummary || 'None'}
        - Work in Progress: ${wipItems.length} active batches.
        - Recent Sales: ${recentSales || 'None'}
        - Recent Purchases: ${recentPurchases || 'None'}
        - Total Invoices in DB: ${invoices.length} (showing analysis based on recent 20).
        
        INSTRUCTIONS:
        You are an intelligent business assistant for Datlion Cnergy. 
        Use the context above to answer questions about stock, sales, and operations.
        If asked about specific numbers not in context, explain you are looking at a summary.
        Keep answers concise and professional.
        `;
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userPrompt = input.trim();
        const systemContext = buildSystemContext();
        const fullPrompt = `${systemContext}\n\nUSER QUESTION: ${userPrompt}`;

        setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
        setInput('');
        setIsLoading(true);
        setErrorMsg('');

        try {
            let responseText = '';
            if (aiProvider === 'ollama') {
                responseText = await generateTextResponseLocal(fullPrompt, localModelUrl, localModelName, localApiKey);
            } else {
                responseText = await generateTextResponse(fullPrompt);
            }
            setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
        } catch (error: any) {
            console.error("Chat Error:", error);
            setErrorMsg(error.message || "Failed to get response.");
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: " + (error.message || "Something went wrong.") }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            {/* Header / Config Bar */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between items-center relative">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <MessageSquare size={18} /> AI Business Assistant
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${aiProvider === 'ollama' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                    >
                        <SettingsIcon size={12} /> Provider: {aiProvider === 'ollama' ? 'Ollama' : 'Gemini 3 Flash'}
                    </button>

                    {showSettings && (
                        <div className="absolute top-10 right-0 w-80 bg-white border border-slate-200 shadow-2xl rounded-xl p-4 z-50 animate-fade-in text-left">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2"><CloudLightning size={16}/> AI Configuration</h4>
                                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><SettingsIcon size={14}/></button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Select Provider</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => setAiProvider('ollama')}
                                            className={`px-3 py-2 text-xs font-medium rounded-md border ${aiProvider === 'ollama' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                        >
                                            Ollama Cloud
                                        </button>
                                        <button 
                                            onClick={() => setAiProvider('gemini')}
                                            className={`px-3 py-2 text-xs font-medium rounded-md border ${aiProvider === 'gemini' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                        >
                                            Gemini
                                        </button>
                                    </div>
                                </div>

                                {aiProvider === 'ollama' && (
                                    <div className="bg-indigo-50 p-3 rounded-md space-y-3 border border-indigo-100">
                                        <div>
                                            <label className="block text-xs font-semibold text-indigo-800 mb-1">Server URL</label>
                                            <input 
                                                type="text" 
                                                className={`w-full p-2 text-xs border rounded focus:ring-1 focus:ring-indigo-500 outline-none ${isMixedContent ? 'border-amber-500 bg-amber-50' : 'border-indigo-200'}`}
                                                placeholder="http://localhost:11434"
                                                value={localModelUrl}
                                                onChange={(e) => setLocalModelUrl(e.target.value)}
                                            />
                                            {isMixedContent && (
                                                <p className="text-[10px] text-amber-700 mt-1 flex items-start gap-1">
                                                    <AlertTriangle size={10} className="mt-0.5"/> 
                                                    Mixed Content: You are on HTTPS but accessing HTTP. This will fail. Use HTTPS for your Ollama server.
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-indigo-800 mb-1">Model Name</label>
                                            <input 
                                                type="text" 
                                                className="w-full p-2 text-xs border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="qwen3-vl:235b-cloud"
                                                value={localModelName}
                                                onChange={(e) => setLocalModelName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-indigo-800 mb-1">API Key (Optional)</label>
                                            <input 
                                                type="password" 
                                                className="w-full p-2 text-xs border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                                placeholder="Bearer Token"
                                                value={localApiKey}
                                                onChange={(e) => setLocalApiKey(e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleTestConnection}
                                            className="w-full bg-indigo-200 hover:bg-indigo-300 text-indigo-800 text-xs py-1.5 rounded transition-colors"
                                        >
                                            Test Connection
                                        </button>
                                        {testStatus && (
                                            <div className={`text-xs p-2 rounded ${testStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {testStatus.message}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {aiProvider === 'gemini' && (
                                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-xs text-blue-800">
                                        Using Google Gemini 3 Flash via API Key injected in environment.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <SparklesIcon className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-medium text-slate-500">How can I help you today?</p>
                        <p className="text-xs mt-2">Try asking: "What is our current cell stock?" or "Summarize recent sales."</p>
                        <p className="text-xs mt-1 text-slate-300">Using: {aiProvider === 'ollama' ? localModelName : 'Gemini 3 Flash'}</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-lg p-3 rounded-bl-none shadow-sm flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                            <span className="text-xs text-slate-400">Thinking...</span>
                        </div>
                    </div>
                )}
                {errorMsg && (
                    <div className="flex justify-center">
                        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-xs flex items-center gap-2">
                            <AlertCircle size={12} /> {errorMsg}
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-2">
                <input 
                    type="text" 
                    className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Type your message..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={isLoading}
                />
                <button 
                    type="submit" 
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default AiChatPanel;

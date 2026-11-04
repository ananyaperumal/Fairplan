import React, { useEffect, useState } from 'react';
import { Shield, Sparkles, CreditCard, PiggyBank, RefreshCw, CheckCircle2, Bookmark } from 'lucide-react';

export const App = () => {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'consumer' | 'merchant'>('consumer');
  const [cases, setCases] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [messages, setMessages] = useState<string[]>([
    "Hello Alex! I am FairPlan Copilot. I analyze subscription telemetry to lower expenses while preserving your favorite apps."
  ]);

  const loadData = async () => {
    try {
      const res = await fetch('/api/consumer/dashboard');
      setData(await res.json());
      const rCases = await fetch('/api/merchant/recovery-cases');
      setCases(await rCases.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadData(); }, []);

  const handleAskCopilot = async () => {
    const res = await fetch('/api/copilot/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Save at least $30 per month, but keep LearnLoop" })
    });
    const d = await res.json();
    setMessages(prev => [...prev, d.response]);
    setProposals(d.proposals || []);
  };

  const handleConfirm = async (proposalId: string) => {
    await fetch('/api/actions/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId })
    });
    setProposals(prev => prev.filter(p => p.id !== proposalId));
    await loadData();
  };

  const handleCapture = async (caseId: string) => {
    await fetch('/api/merchant/recovery-cases/' + caseId + '/capture', { method: 'POST' });
    await loadData();
  };

  if (!data) return <div className="p-8 text-center text-gray-500 font-medium">Loading FairPlan Copilot...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-900 text-white p-4 px-8 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-3">
          <div className="bg-teal-600 p-2 rounded-lg text-white"><Shield className="w-5 h-5" /></div>
          <div>
            <h1 className="font-bold text-lg leading-tight">FairPlan</h1>
            <p className="text-xs text-slate-400">AI Subscription & Churn-Saver Copilot</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full font-medium">
            Simulated Demo Mode
          </span>
          <div className="flex bg-slate-800 p-1 rounded-lg">
            <button onClick={() => setActiveTab('consumer')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'consumer' ? 'bg-teal-600 text-white shadow' : 'text-slate-400'}`}>Consumer Hub</button>
            <button onClick={() => setActiveTab('merchant')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'merchant' ? 'bg-teal-600 text-white shadow' : 'text-slate-400'}`}>Merchant Workspace</button>
          </div>
          <button onClick={loadData} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1">
        {activeTab === 'consumer' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-lg"><CreditCard className="w-6 h-6" /></div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Monthly Commitment</div>
                  <div className="text-2xl font-bold text-gray-900">{data.metrics.monthlyCommitmentFormatted}</div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><PiggyBank className="w-6 h-6" /></div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Active Services</div>
                  <div className="text-2xl font-bold text-gray-900">{data.metrics.activeCount}</div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Shield className="w-6 h-6" /></div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Paused Services</div>
                  <div className="text-2xl font-bold text-amber-600">{data.metrics.pausedCount}</div>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><CheckCircle2 className="w-6 h-6" /></div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Cancelled Services</div>
                  <div className="text-2xl font-bold text-rose-600">{data.metrics.cancelledCount}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-gray-900">Your Active Subscriptions</h2>
                  <span className="text-xs text-gray-400">Scattered merchant data synced</span>
                </div>
                <div className="space-y-3">
                  {data.subscriptions.map((s: any) => (
                    <div key={s.id} className="p-4 border rounded-xl flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition">
                      <div>
                        <div className="font-bold text-gray-900 flex items-center space-x-2">
                          <span>{s.service_name}</span>
                          {s.keepFlag && <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">PROTECTED (KEEP)</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {s.usage?.lastActiveTimestamp ? 'Telemetry: Active 65+ days ago' : 'Usage: Unknown'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">${(s.currentPriceCents / 100).toFixed(2)}/mo</div>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold inline-block mt-1 ${
                          s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                          s.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col h-[520px]">
                <div className="font-bold text-gray-900 mb-3 flex items-center justify-between border-b pb-3">
                  <span className="flex items-center text-teal-700"><Sparkles className="w-4 h-4 mr-1 text-teal-600" /> FairPlan AI Reasoning Copilot</span>
                  <span className="text-[11px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono font-semibold">Structured Tools</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-lg text-xs whitespace-pre-wrap">
                  {messages.map((m, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm text-gray-800 leading-relaxed">{m}</div>
                  ))}
                  {proposals.map(p => (
                    <div key={p.id} className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-bold text-teal-900">Action: {p.actionType}</div>
                        <div className="text-emerald-700 font-semibold">Savings: ${(p.projectedMonthlySavingsCents / 100).toFixed(2)}/mo</div>
                        <div className="text-[10px] text-gray-400 font-mono">Token: {p.id.substring(0, 16)}...</div>
                      </div>
                      <button onClick={() => handleConfirm(p.id)} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-xs shadow transition">
                        Confirm Action
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <button onClick={handleAskCopilot} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow transition flex items-center justify-center">
                    <Sparkles className="w-4 h-4 mr-2" /> Run Demo Scenario: Save $30/mo & Keep LearnLoop
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Merchant Workspace: Payment Failure Recovery Queue</h2>
              <p className="text-xs text-gray-500">Transparent recovery outbox & authorized outstanding balance capture</p>
            </div>
            <div className="divide-y divide-gray-200">
              {cases.map((c: any) => (
                <div key={c.id} className="py-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-900">{c.service_name} — Outstanding: ${(c.outstanding_balance_cents / 100).toFixed(2)}</div>
                    <div className="text-xs text-gray-500 italic mt-0.5">"{c.draft_message}"</div>
                  </div>
                  {c.status === 'OPEN' ? (
                    <button onClick={() => handleCapture(c.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow transition">
                      Capture Outstanding Balance
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Payment Verified & Recovered</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

LifeNodeOS: Master Code Vault (Final Build Version)
This document contains the raw React/Tailwind code for the 7 primary views and the onboarding flow of LifeNodeOS.

1. Onboarding & Universal Landing Page
File: Onboarding.jsx
Visuals: Clean, premium aesthetic with smooth integration ticker and multi-step "Aha!" sequence.

import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Circle, Briefcase, Home, Moon, Mail, Calendar, HeartPulse, Lock, Sparkles, Loader2, TrendingUp, Activity, MessageSquare, FileText, CreditCard, CheckSquare, Video, ShoppingCart, PenTool, Scale } from 'lucide-react';

export default function Onboarding() {
  const [step, setStep] = useState(0); 
  const [selectedNodes, setSelectedNodes] = useState({ work: false, home: false, va: false, trader: false, vital: false, pro: false });
  const [loadingStep, setLoadingStep] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  
  const demographics = [
    { role: "Parents", color: "text-[#F59E0B]", highlight: "Household Logistics" },
    { role: "Founders", color: "text-[#2563EB]", highlight: "Business Operations" },
    { role: "Traders", color: "text-[#06B6D4]", highlight: "Market Execution" },
    { role: "Freelancers", color: "text-[#0D9488]", highlight: "Client Management" },
    { role: "Your Entire Life", color: "text-[#6366F1]", highlight: "Everything" }
  ];

  const integrations = [
    { name: "Gmail", icon: <Mail size={16} /> }, { name: "Slack", icon: <MessageSquare size={16} /> },
    { name: "Notion", icon: <FileText size={16} /> }, { name: "Apple Health", icon: <HeartPulse size={16} /> },
    { name: "Stripe", icon: <CreditCard size={16} /> }, { name: "Asana", icon: <CheckSquare size={16} /> },
    { name: "Zoom", icon: <Video size={16} /> }, { name: "Oura", icon: <Activity size={16} /> },
    { name: "Google Calendar", icon: <Calendar size={16} /> }, { name: "Shopify", icon: <ShoppingCart size={16} /> },
    { name: "Figma", icon: <PenTool size={16} /> },
  ];

  useEffect(() => {
    if (step === 0) {
      const interval = setInterval(() => setHeroIndex(prev => (prev + 1) % demographics.length), 2500);
      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    if (step === 3) {
      setTimeout(() => setLoadingStep(1), 1500);
      setTimeout(() => setLoadingStep(2), 3000);
      setTimeout(() => setLoadingStep(3), 4500);
      setTimeout(() => setStep(4), 6500); 
    }
  }, [step]);

  const toggleNode = (key) => setSelectedNodes(prev => ({ ...prev, [key]: !prev[key] }));
  const isQuizValid = Object.values(selectedNodes).some(Boolean);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-800 font-sans flex flex-col relative overflow-hidden transition-colors duration-700">
      <style>{`
        @import url('[https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap](https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap)');
        h1, h2, h3, .brand-logo { font-family: 'Outfit', sans-serif; }
        .font-playfair { font-family: 'Playfair Display', serif; }
        .fade-in { animation: fadeIn 0.8s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        .animate-marquee { display: flex; width: max-content; animation: marquee 35s linear infinite; }
      `}</style>

      {/* Nav */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-900"></div>
          <span className="brand-logo font-bold text-slate-900 tracking-wide text-xl">Life<span className="font-light text-slate-400">Node</span></span>
        </div>
      </nav>

      {/* STEP 0: Universal Landing */}
      {step === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 fade-in mt-16">
          <div className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8 border border-slate-200 shadow-sm">Meet LifeNodeOS</div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 max-w-4xl tracking-tight mb-6 leading-[1.1] transition-all duration-500">
            The Operating System for <br />
            <span className={`font-playfair italic transition-colors duration-500 ${demographics[heroIndex].color}`}>{demographics[heroIndex].role}.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mb-10 leading-relaxed h-16">
            Stop toggling between 15 different apps. Unify your <span className="font-bold text-slate-700">{demographics[heroIndex].highlight}</span>, physical recovery, and daily tasks into one intelligent dashboard.
          </p>
          <button onClick={() => setStep(1)} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all hover:scale-105 shadow-xl">
            Build Your Dashboard <ArrowRight size={20} />
          </button>
          
          <div className="mt-16 w-full max-w-6xl overflow-hidden relative opacity-40 grayscale before:absolute before:left-0 before:top-0 before:w-32 before:h-full before:bg-gradient-to-r before:from-[#FDFDFD] before:to-transparent before:z-10 after:absolute after:right-0 after:top-0 after:w-32 after:h-full after:bg-gradient-to-l after:from-[#FDFDFD] after:to-transparent after:z-10">
            <div className="animate-marquee flex items-center">
              {[...integrations, ...integrations].map((app, i) => (
                <div key={i} className="flex items-center gap-2 font-bold text-sm whitespace-nowrap mx-6 text-slate-600">
                  {app.icon} <span>{app.name}</span> <span className="text-slate-300 ml-6 text-[10px]">♦</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Quiz */}
      {step === 1 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full fade-in z-10">
           <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Which hats are you wearing?</h2>
           <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              <div onClick={() => toggleNode('work')} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedNodes.work ? 'border-[#2563EB] bg-[#2563EB]/5 shadow-md' : 'border-slate-200'}`}>
                <h3 className="font-bold text-md mb-2">WorkNode</h3>
                <p className="text-xs text-slate-500">Business, pipelines, and operations.</p>
              </div>
              <div onClick={() => toggleNode('home')} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedNodes.home ? 'border-[#F59E0B] bg-[#F59E0B]/5 shadow-md' : 'border-slate-200'}`}>
                <h3 className="font-bold text-md mb-2">HomeNode</h3>
                <p className="text-xs text-slate-500">Fridge vision, groceries, family hub.</p>
              </div>
              <div onClick={() => toggleNode('va')} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedNodes.va ? 'border-[#0D9488] bg-[#0D9488]/5 shadow-md' : 'border-slate-200'}`}>
                <h3 className="font-bold text-md mb-2">VANode</h3>
                <p className="text-xs text-slate-500">Client sandboxes & 1-click reports.</p>
              </div>
              <div onClick={() => toggleNode('trader')} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedNodes.trader ? 'border-[#06B6D4] bg-[#06B6D4]/5 shadow-md' : 'border-slate-200'}`}>
                <h3 className="font-bold text-md mb-2">TraderNode</h3>
                <p className="text-xs text-slate-500">Markets, journals, and sniper mode.</p>
              </div>
              <div onClick={() => toggleNode('vital')} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedNodes.vital ? 'border-[#84A59D] bg-[#84A59D]/5 shadow-md' : 'border-slate-200'}`}>
                <h3 className="font-bold text-md mb-2">VitalNode</h3>
                <p className="text-xs text-slate-500">Sleep, health & AI scheduling.</p>
              </div>
              <div onClick={() => toggleNode('pro')} className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${selectedNodes.pro ? 'border-[#1E293B] bg-[#1E293B]/5 shadow-md' : 'border-slate-200'}`}>
                <h3 className="font-bold text-md mb-2">ProNode</h3>
                <p className="text-xs text-slate-500">Legal, Medical & Case management.</p>
              </div>
           </div>
           <button onClick={() => setStep(2)} disabled={!isQuizValid} className="bg-slate-900 text-white px-10 py-4 rounded-full font-bold">Continue</button>
        </div>
      )}

      {/* STEP 2-4 (Summary) */}
      {step === 4 && (
        <div className="fixed inset-0 bg-[#E8E6E6] z-50 flex flex-col p-6 items-center justify-center fade-in">
            <div className="bg-white/95 p-8 rounded-[2rem] border-l-8 border-[#0D9488] shadow-2xl max-w-4xl">
              <h3 className="font-bold text-2xl mb-2 font-playfair italic text-[#0D9488]">The OS is Ready.</h3>
              <p className="text-slate-600 text-lg mb-6">Your nodes have been assembled based on your sleep, schedule, and client data.</p>
              <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">Launch Dashboard</button>
            </div>
        </div>
      )}
    </div>
  );
}

2. WorkNode (Business & Pipeline)
File: WorkNode.jsx
Aesthetic: Focus Blue (#2563EB). Kanban & CRM.

import React, { useState } from 'react';
import { Briefcase, Mail, CheckCircle2, Layout, Users, TrendingUp, Inbox, ArrowRight, Zap, Target } from 'lucide-react';

export default function WorkNode() {
  const [isDeepWork, setIsDeepWork] = useState(false);

  return (
    <div className={`min-h-screen transition-all duration-700 ${isDeepWork ? 'bg-slate-950 grayscale' : 'bg-[#F8FAFC]'} p-6 text-slate-800`}>
      <div className="max-w-[1500px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-playfair">Good morning, Founder.</h1>
            <p className="text-sm text-slate-500">You have 4 new leads and 2 approvals waiting.</p>
          </div>
          <button 
            onClick={() => setIsDeepWork(!isDeepWork)}
            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isDeepWork ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            <Target size={18} /> {isDeepWork ? 'Exit Deep Work' : 'Enter Deep Work'}
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className={`lg:col-span-4 flex flex-col gap-6 transition-opacity ${isDeepWork ? 'opacity-20' : 'opacity-100'}`}>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="font-bold mb-6 flex items-center gap-2 text-blue-600"><Inbox size={18}/> Smart Triage</h2>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                   <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Urgent Approval</span>
                   <h4 className="text-sm font-bold mt-1">Contract for Project Phoenix</h4>
                   <p className="text-xs text-slate-500 mt-1">AI Summary: Needs signature by EOD to meet shipping deadline.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex-1">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-8"><Layout size={20} className="text-blue-600"/> Growth Pipeline</h2>
              <div className="grid grid-cols-3 gap-6">
                 {['Discovery', 'In Discussion', 'Closing'].map((col) => (
                   <div key={col} className="flex flex-col gap-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-2">{col}</h4>
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200 min-h-[300px]"></div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

3. HomeNode (Domestic Logistics)
File: HomeNode.jsx
Aesthetic: Sage Green (#84A59D). Fridge Vision & Family Hub.

import React, { useState } from 'react';
import { Camera, Calendar, ShieldCheck, ChefHat, ShoppingCart, Sparkles } from 'lucide-react';

export default function HomeNode() {
  const [isScanning, setIsScanning] = useState(false);
  const handleScan = () => { setIsScanning(true); setTimeout(() => setIsScanning(false), 2500); };

  return (
    <div className="min-h-screen bg-[#E8E6E6] p-6 text-slate-800 font-sans">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="font-bold mb-4 flex items-center gap-2 text-[#84A59D]"><Camera size={18}/> Fridge Vision</h2>
            <div onClick={handleScan} className="aspect-square bg-slate-100 rounded-2xl flex items-center justify-center cursor-pointer border border-slate-200 relative overflow-hidden group">
               {isScanning ? <div className="absolute top-0 w-full h-1 bg-[#84A59D] shadow-[0_0_15px_#84A59D] animate-pulse"></div> : <span className="font-bold text-slate-400">Click to Scan Fridge</span>}
            </div>
          </div>
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
             <h2 className="font-bold mb-2 flex items-center gap-2"><ShoppingCart size={18} className="text-[#84A59D]"/> Smart Cart</h2>
             <button className="w-full mt-4 bg-[#84A59D] py-3 rounded-xl font-bold">Checkout Amazon Fresh</button>
          </div>
        </div>
        <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-slate-200">
           <h2 className="font-bold mb-6 text-xl flex items-center gap-2"><Calendar size={22} className="text-[#84A59D]"/> Family Logistics</h2>
           <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4">
              <h4 className="font-bold">Leo's Field Trip</h4>
              <p className="text-xs text-slate-500 mt-1">Friday, 08:00 AM • Pack extra water bottle</p>
           </div>
        </div>
        <div className="lg:col-span-3 flex flex-col gap-6">
           <div className="bg-white p-6 rounded-3xl border border-slate-200">
              <h2 className="font-bold mb-4 text-[#84A59D]"><ShieldCheck size={18} className="inline mr-2"/> Resilience</h2>
              <div className="w-full h-1.5 bg-slate-100 rounded-full"><div className="h-full bg-orange-400 w-[15%]"></div></div>
           </div>
        </div>
      </div>
    </div>
  );
}

4. VANode (Client Management)
File: VANode.jsx
Aesthetic: Arctic Teal (#0D9488). Multi-client switchboard.

import React from 'react';
import { Lock, Mail, MessageSquare, Sparkles } from 'lucide-react';

export default function VANode() {
  return (
    <div className="min-h-screen bg-[#F0FDFA] p-6 text-slate-800">
       <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-4 mb-8">
             <div className="px-6 py-3 bg-[#0D9488] text-white rounded-xl font-bold shadow-lg ring-4 ring-[#0D9488]/20">TechFlow Inc.</div>
             <div className="px-6 py-3 bg-white text-slate-400 border border-slate-200 rounded-xl font-bold hover:text-[#0D9488] cursor-pointer">Client B</div>
          </div>
          <div className="grid grid-cols-12 gap-8">
             <div className="col-span-4 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                   <h2 className="font-bold mb-4 flex items-center gap-2 text-[#0D9488]"><Lock size={18}/> Security Vault</h2>
                   <div className="p-4 bg-slate-50 rounded-2xl text-xs font-bold text-slate-400 text-center">Hover to Unlock Credential</div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex-1 shadow-sm overflow-hidden flex flex-col">
                   <h2 className="font-bold mb-4 flex items-center gap-2 text-[#0D9488]"><MessageSquare size={18}/> Unified Feed</h2>
                   <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium">"Can we push the meeting?"</div>
                </div>
             </div>
             <div className="col-span-8 bg-white p-10 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                <Sparkles size={32} className="text-[#0D9488] mb-6" />
                <h2 className="text-2xl font-bold mb-2">EOD Report Ready.</h2>
                <button className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl">Generate & Send to Client</button>
             </div>
          </div>
       </div>
    </div>
  );
}

5. TraderNode (Finance Terminal)
File: TraderNode.jsx
Aesthetic: Deep Onyx (#2B2C31). Sniper Mode & High Intensity.

import React, { useState } from 'react';
import { Target, Activity, Zap, Eye, EyeOff, Crosshair } from 'lucide-react';

export default function TraderNode() {
  const [isPnlVisible, setIsPnlVisible] = useState(false);
  const [isSniperMode, setIsSniperMode] = useState(false);

  return (
    <div className={`min-h-screen bg-[#2B2C31] text-zinc-100 p-6 transition-all duration-700`}>
       <div className="max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_cyan]"></div>
                <h1 className="font-bold text-xl">Trader<span className="text-zinc-500 font-light">Node</span></h1>
             </div>
             <div className="flex gap-4">
                <div className={`bg-[#18181B] px-4 py-2 rounded-xl border border-zinc-800 flex items-center gap-3 ${isSniperMode ? 'opacity-0' : 'opacity-100'}`}>
                   <span className={`font-mono font-bold text-[#10B981] ${isPnlVisible ? 'blur-none' : 'blur-md'}`}>+$3,450.20</span>
                   <button onClick={() => setIsPnlVisible(!isPnlVisible)}>{isPnlVisible ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                </div>
                <button onClick={() => setIsSniperMode(!isSniperMode)} className={`px-6 py-3 rounded-xl font-bold text-sm ${isSniperMode ? 'bg-cyan-500 text-black' : 'bg-[#18181B] text-cyan-500 border border-zinc-800'}`}>
                   <Target size={18} className="inline mr-2"/> {isSniperMode ? 'Exit Sniper' : 'Enter Sniper Mode'}
                </button>
             </div>
          </div>
          <div className="grid grid-cols-12 gap-6">
             <div className="col-span-9 bg-[#18181B] h-[600px] rounded-3xl border border-zinc-800 relative flex items-center justify-center">
                {isSniperMode && <Crosshair size={120} className="text-cyan-500/10 animate-pulse" />}
                <span className="text-zinc-700 font-mono italic">Trading Engine Active</span>
             </div>
             <div className="col-span-3 bg-[#18181B] p-6 rounded-2xl border border-zinc-800 flex flex-col gap-6">
                <h2 className="font-bold text-purple-500 flex items-center gap-2"><Zap size={18}/> Psych Check</h2>
                <div className="grid grid-cols-2 gap-2">
                   {['Setup Present', 'FOMO', 'Revenge'].map(mood => <button key={mood} className="bg-[#09090B] p-3 rounded-xl text-[10px] font-bold border border-zinc-800 text-zinc-400">{mood}</button>)}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

6. VitalNode (Health & Longevity)
File: VitalNode.jsx
Aesthetic: Pulse Coral (#FF7F50). Sleep tracking & Cross-node magic.

import React, { useState } from 'react';
import { Heart, Activity, Wind, Flame, CalendarCheck, Moon, Shield } from 'lucide-react';

export default function VitalNode() {
  const [isWindDown, setIsWindDown] = useState(false);

  if (isWindDown) {
     return (
       <div className="min-h-screen bg-amber-900 flex flex-col items-center justify-center text-amber-50 transition-all duration-1000">
          <Moon className="w-16 h-16 mb-8 text-amber-400 opacity-80" />
          <h1 className="text-4xl font-bold font-playfair italic">Time to disconnect.</h1>
          <button onClick={() => setIsWindDown(false)} className="mt-12 px-10 py-4 bg-white/10 rounded-full font-bold">Exit Protocol</button>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#E8E6E6] text-slate-800 p-6 font-sans">
       <div className="max-w-[1400px] mx-auto">
          <div className="bg-white p-10 rounded-[2.5rem] mb-8 border border-slate-200 flex justify-between items-center shadow-sm">
             <div>
                <h1 className="text-4xl font-bold font-playfair italic text-slate-900">Good morning, <br/> your recovery is at <span className="text-[#FF7F50]">42%</span>.</h1>
                <div className="mt-8 bg-[#FF7F50]/10 p-5 rounded-2xl border border-[#FF7F50]/20 text-sm italic">
                   AI Insight: "Pushed 'Deep Work' blocks to tomorrow due to low HRV."
                </div>
             </div>
             <button onClick={() => setIsWindDown(true)} className="px-8 py-4 bg-slate-900 text-white rounded-full font-bold"><Wind size={18} className="inline mr-2"/> Wind Down</button>
          </div>
          <div className="grid grid-cols-12 gap-8">
             <div className="col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><h2 className="font-bold flex items-center gap-2 text-[#84A59D]"><Flame size={18}/> Nutrition</h2></div>
             <div className="col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"><h2 className="font-bold flex items-center gap-2 text-[#84A59D]"><CalendarCheck size={22}/> Protocol</h2></div>
             <div className="col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group overflow-hidden">
                <h2 className="font-bold flex items-center gap-2 text-[#84A59D]"><Shield size={18}/> Bio Vault</h2>
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center font-bold text-xs uppercase tracking-widest text-slate-400">Locked</div>
             </div>
          </div>
       </div>
    </div>
  );
}

7. ProNode (Professional Hub)
File: ProNode.jsx
Visuals: Studio Gray (#F1F5F9). Large cards and blinking invoice sync button.

import React, { useState } from 'react';
import { Target, Search, FileText, Clock, Sparkles, MessageSquare, Lock, Scale, MoreHorizontal, ChevronRight } from 'lucide-react';

export default function ProNode() {
  const [activeFile, setActiveFile] = useState('Case #882 - Miller v. SkyCorp');
  const [isDeepFocus, setIsDeepFocus] = useState(false);

  return (
    <div className={`min-h-screen transition-all duration-700 font-sans ${isDeepFocus ? 'bg-slate-950' : 'bg-[#F1F5F9]'} text-slate-800 p-6`}>
      <style>{`
        @keyframes sync-blink {
          0%, 100% { background-color: #0f172a; box-shadow: 0 0 0px rgba(99, 102, 241, 0); }
          50% { background-color: #1e293b; box-shadow: 0 0 15px rgba(99, 102, 241, 0.4); }
        }
        .animate-sync-blink { animation: sync-blink 2s infinite ease-in-out; }
      `}</style>
      <div className="max-w-[1500px] mx-auto grid grid-cols-12 gap-8">
        <div className={`col-span-3 transition-all duration-500 ${isDeepFocus ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 h-full shadow-sm">
            <h2 className="text-xs font-bold uppercase text-slate-400 mb-6 tracking-widest">Active Files</h2>
            <div className="p-5 bg-slate-900 text-white rounded-2xl mb-3 shadow-xl cursor-pointer">
              <h4 className="font-bold text-base">Miller v. SkyCorp</h4>
              <span className="text-[10px] opacity-60">High Priority</span>
            </div>
            <div className="p-4 bg-white border border-slate-100 rounded-2xl mb-3 hover:border-slate-300 cursor-pointer">
              <h4 className="text-sm font-bold">Patient Brief: Sarah Chen</h4>
              <span className="text-[10px] text-slate-400">Clinical Review</span>
            </div>
          </div>
        </div>
        <div className="col-span-6 flex flex-col gap-6">
          <div className={`bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex-1 ${isDeepFocus ? 'ring-4 ring-purple-500/30 shadow-2xl' : ''}`}>
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
              <h2 className="text-2xl font-bold font-playfair italic">{activeFile}</h2>
              <button onClick={() => setIsDeepFocus(!isDeepFocus)} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-all">
                 {isDeepFocus ? 'Exit Focus' : 'Focus Mode'}
              </button>
            </div>
            <div className="p-12 font-body text-slate-700 leading-relaxed text-2xl">
              <p>Strategy Review: Discovery in <span className="font-bold text-slate-900">Exhibit 4A</span> confirms infringement.</p>
              <div className="p-8 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-2xl italic my-8 text-lg text-indigo-900">
                AI Insight: "Development timeline matches engineer departure date exactly."
              </div>
            </div>
            <div className="p-5 px-10 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-6">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <div className="text-2xl font-mono font-bold tracking-tighter">01:22:45</div>
              </div>
              <button className="animate-sync-blink text-white px-8 py-3 rounded-xl text-xs font-black uppercase border border-white/20 hover:scale-105">Generate Invoice Sync</button>
            </div>
          </div>
        </div>
        <div className={`col-span-3 flex flex-col gap-6 transition-all duration-500 ${isDeepFocus ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
           <div className="bg-gradient-to-br from-white to-purple-50 p-10 rounded-3xl border border-purple-100 shadow-sm min-h-[450px]">
              <h2 className="text-xs font-bold text-purple-600 uppercase mb-8 flex items-center gap-2 tracking-widest"><Sparkles size={16}/> Sidecar</h2>
              <div className="space-y-6">
                 <div className="p-8 bg-white rounded-2xl border border-purple-100 shadow-sm hover:border-purple-300 transition-all cursor-pointer">
                    <h4 className="text-xl font-bold text-slate-800 mb-2 leading-tight">Precedent: Smith v. Global</h4>
                    <p className="text-base text-slate-500 leading-relaxed font-body">92% match to current argument. Found in Supreme Court Archives.</p>
                 </div>
              </div>
              <button className="w-full mt-auto pt-8 text-sm font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center justify-center gap-2">
                Open Case Library <ChevronRight size={16} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

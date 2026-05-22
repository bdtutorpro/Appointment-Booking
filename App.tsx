import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { 
  Sparkles, 
  LayoutDashboard,
  Clock
} from 'lucide-react';
import LiveAgent from './components/LiveAgent';
import AdminDashboard from './components/AdminDashboard';

function VoiceAssistantPage() {
  return (
    <div className="min-h-screen bg-[#0d0517] text-purple-100 flex flex-col justify-between selection:bg-amber-500 selection:text-purple-950 font-sans">
      {/* Main Premium Header */}
      <header className="bg-[#130722]/90 backdrop-blur-md border-b border-purple-950/40 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-800 to-indigo-950 flex items-center justify-center border border-amber-400/40 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <span className="block font-serif text-base sm:text-lg font-bold tracking-tight text-white">
                Sparkle Skin, Laser & Aesthetic
              </span>
              <span className="block text-[9px] text-amber-500 tracking-widest uppercase font-bold">
                Luxury Aesthetics Dhaka
              </span>
            </div>
          </div>

          <Link 
            to="/admin" 
            className="px-4 py-2 text-xs font-bold text-purple-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-95 transition-all rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/10"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Admin Portal
          </Link>
        </div>
      </header>

      {/* Dedicated Assistant View */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-center items-center my-8">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold text-white tracking-tight leading-tight">
            24/7 Assistant Shoma
          </h1>
          <p className="text-purple-200/80 text-sm max-w-lg mx-auto font-light leading-relaxed">
            Shoma is your 24/7 direct voice support assistant. Book aesthetic treatment appointments, ask about pricing, laser procedures, or diagnostic services instantly.
          </p>
        </div>

        {/* Embedded Live Agent Component */}
        <div className="w-full">
          <LiveAgent />
        </div>
      </main>

      {/* Luxury Minimalist Footer */}
      <footer className="bg-[#0b0313] text-purple-300 border-t border-purple-950/40 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-xs gap-4 text-purple-400">
          <div className="text-center sm:text-left space-y-1">
            <p className="font-semibold text-white">Sparkle Skin, Laser & Aesthetic Centre, Dhaka</p>
            <p className="text-purple-300/60 font-light">145/1, Crescent Plaza, Green Road, Dhaka, Bangladesh</p>
          </div>
          <div className="text-center sm:text-right space-y-1">
            <p>© {new Date().getFullYear()} Sparkle Skin Centre. All Rights Reserved.</p>
            <p className="text-[10px]">
              Powered by <a href="https://rritglobal.online" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">RR IT Global</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VoiceAssistantPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

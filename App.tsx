import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { 
  Sparkles, 
  LayoutDashboard,
  MapPin,
  Clock,
  ShieldCheck,
  Award
} from 'lucide-react';
import LiveAgent from './components/LiveAgent';
import AdminDashboard from './components/AdminDashboard';

function VoiceAssistantPage() {
  return (
    <div className="min-h-screen bg-[#0d0517] text-purple-100 flex flex-col justify-between selection:bg-amber-500 selection:text-purple-950 font-sans">
      {/* Top Banner with Clinic Schedule */}
      <div className="bg-[#1D0E30] text-amber-100 py-2.5 px-4 text-xs font-medium border-b border-amber-500/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span className="flex items-center gap-1.5 text-amber-400">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              145/1, Crescent Plaza, Green Road, Dhaka
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              Doctor Schedule: 2:00 PM - 8:00 PM (Weekly Holiday: Wednesday)
            </span>
          </div>
          <div className="font-semibold text-amber-400">
            Call support: 096 3929 7137 , 013 1051 9250
          </div>
        </div>
      </div>

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
        
        {/* Support Highlights */}
        <div className="grid grid-cols-2 gap-4 max-w-2xl w-full mt-10">
          <div className="bg-[#18092a]/50 p-4 rounded-xl border border-purple-900/30 text-center space-y-1">
            <Award className="w-4 h-4 text-amber-400 mx-auto" />
            <span className="block text-white text-xs font-semibold">Instant Diagnostics</span>
            <p className="text-[10px] text-purple-300 font-light">Price listings and details via AI</p>
          </div>
          <div className="bg-[#18092a]/50 p-4 rounded-xl border border-purple-900/30 text-center space-y-1">
            <ShieldCheck className="w-4 h-4 text-amber-400 mx-auto" />
            <span className="block text-white text-xs font-semibold">Priority Booking</span>
            <p className="text-[10px] text-purple-300 font-light">Digital PDF confirmation download</p>
          </div>
        </div>

        {/* Available Doctors & Schedule Visual Card */}
        <div className="w-full max-w-3xl mt-12 bg-[#130722]/80 border border-purple-950/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-2.5 mb-5 justify-center md:justify-start">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-serif font-bold text-white">Daily Doctor Schedule</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <div className="p-3.5 rounded-xl bg-[#1d0e30]/50 border border-purple-900/20 text-left">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Friday</span>
              <span className="block text-white text-xs font-semibold mt-1">Dr. Silveeya Chowdhury</span>
              <p className="text-[10px] text-purple-300 font-mono mt-0.5">3:00 PM - 8:00 PM</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1d0e30]/50 border border-purple-900/20 text-left">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Saturday</span>
              <div className="space-y-2 mt-1">
                <div>
                  <span className="block text-white text-xs font-semibold">Dr. Silveeya Chowdhury</span>
                  <p className="text-[10px] text-purple-300 font-mono mt-0.5">3:00 PM - 8:00 PM</p>
                </div>
                <div className="border-t border-purple-900/30 pt-1.5">
                  <span className="block text-white text-xs font-semibold">Dr. Asma Sharmin</span>
                  <p className="text-[10px] text-purple-300 font-mono mt-0.5">3:00 PM - 8:00 PM</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1d0e30]/50 border border-purple-900/20 text-left">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Sunday</span>
              <span className="block text-white text-xs font-semibold mt-1">Dr. Arifur Rahman</span>
              <p className="text-[10px] text-purple-300 font-mono mt-0.5">3:00 PM - 8:00 PM</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1d0e30]/50 border border-purple-900/20 text-left">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Monday</span>
              <div className="space-y-2 mt-1">
                <div>
                  <span className="block text-white text-xs font-semibold">Dr. Asma Sharmin</span>
                  <p className="text-[10px] text-purple-300 font-mono mt-0.5">3:00 PM - 8:00 PM</p>
                </div>
                <div className="border-t border-purple-900/30 pt-1.5">
                  <span className="block text-white text-xs font-semibold">Dr. Ismat Ara Juthi</span>
                  <p className="text-[10px] text-purple-300 font-mono mt-0.5">3:00 PM - 8:00 PM</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1d0e30]/50 border border-purple-900/20 text-left">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Tuesday</span>
              <div className="space-y-2 mt-1">
                <div>
                  <span className="block text-white text-xs font-semibold">Dr. Silveeya Chowdhury</span>
                  <p className="text-[10px] text-purple-300 font-mono mt-0.5">3:00 PM - 8:00 PM</p>
                </div>
                <div className="border-t border-purple-900/30 pt-1.5">
                  <span className="block text-white text-xs font-semibold">Dr. Farzana Rahman Shathi</span>
                  <p className="text-[10px] text-purple-300 font-mono mt-0.5">2:00 PM - 8:00 PM</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-rose-950/20 text-left relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold text-rose-450 tracking-wider">Wednesday</span>
              <span className="block text-rose-400 text-xs font-semibold mt-1">Closed</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Weekly Clinic Holiday</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1d0e30]/50 border border-purple-900/20 text-left lg:col-span-3 lg:grid lg:grid-cols-3 lg:gap-4">
              <div className="lg:col-span-3">
                <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider block">Thursday</span>
              </div>
              <div className="mt-1 lg:mt-0">
                <span className="block text-white text-xs font-semibold">Dr. Silveeya Chowdhury</span>
                <p className="text-[10px] text-purple-300 font-mono mt-0.5">Alt: 3:00 PM - 8:00 PM</p>
              </div>
              <div className="mt-2 lg:mt-0 border-t md:border-t-0 border-purple-900/30 pt-1.5 lg:pt-0">
                <span className="block text-white text-xs font-semibold">Dr. Farzana Rahman Shathi</span>
                <p className="text-[10px] text-purple-300 font-mono mt-0.5">2:00 PM - 8:00 PM</p>
              </div>
              <div className="mt-2 lg:mt-0 border-t md:border-t-0 border-purple-900/30 pt-1.5 lg:pt-0">
                <span className="block text-white text-xs font-semibold">Dr. Manna Salwa Bulbul</span>
                <p className="text-[10px] text-purple-300 font-mono mt-0.5">3:00 PM - 8:00 PM</p>
              </div>
            </div>

          </div>
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

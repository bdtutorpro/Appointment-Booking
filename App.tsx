import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LiveAgent from './components/LiveAgent';
import AdminDashboard from './components/AdminDashboard';
import { LayoutDashboard } from 'lucide-react';

function AgentPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl flex justify-end mb-4">
        <Link 
          to="/admin" 
          className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Admin Dashboard
        </Link>
      </div>
      <div className="max-w-3xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
            Appointment Booking <span className="text-teal-600">Assistant</span>
          </h1>

        </div>

        <div className="mt-10">
           <LiveAgent />
        </div>

        <footer className="mt-16 text-slate-400 text-sm">
          <p>Powered by <a href="https://rritglobal.online" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 transition-colors">RR IT</a></p>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AgentPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
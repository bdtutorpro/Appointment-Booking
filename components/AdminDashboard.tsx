import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Search, 
  Calendar, 
  Phone, 
  User, 
  CheckCircle, 
  Clock, 
  Lock, 
  Sparkles, 
  LayoutDashboard, 
  Users, 
  MessageCircle, 
  Activity, 
  Check, 
  Trash2, 
  TrendingUp, 
  Scissors, 
  ChevronRight,
  ShieldCheck 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'appointments' | 'leads'>('appointments');
  const [bookings, setBookings] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  
  const [bookingSearch, setBookingSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // Update booking status in firestore database
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const docRef = doc(db, 'bookings', bookingId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating booking status:', err);
    }
  };

  // Authenticate and subscribe to database
  useEffect(() => {
    if (!isAuthenticated) return;

    // Sub to booking schedules
    const bQuery = query(collection(db, 'bookings'), orderBy('date', 'desc'));
    const unsubBookings = onSnapshot(bQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
      setLoadingBookings(false);
    }, (err) => {
      console.error(err);
      setLoadingBookings(false);
    });

    // Sub to prospective callback leads
    const lQuery = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubLeads = onSnapshot(lQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeads(data);
      setLoadingLeads(false);
    }, (err) => {
      console.error(err);
      setLoadingLeads(false);
    });

    return () => {
      unsubBookings();
      unsubLeads();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '900900900') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Incorrect Administrator Password.');
    }
  };

  // Update lead status in firestore database
  const handleUpdateLeadStatus = async (leadId: string, currentStatus: string) => {
    const nextStatusMap: Record<string, string> = {
      'New': 'Contacted',
      'Contacted': 'Interested',
      'Interested': 'Converted',
      'Converted': 'New'
    };
    const nextStatus = nextStatusMap[currentStatus] || 'New';
    
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        lead_status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating lead status:', err);
    }
  };

  // Delete absolute duplicate/test entry
  const handleDeleteBooking = async (bId: string) => {
    if(!window.confirm('Delete this booking?')) return;
    try {
      await deleteDoc(doc(db, 'bookings', bId));
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteLead = async (lId: string) => {
    if(!window.confirm('Delete this callback lead?')) return;
    try {
      await deleteDoc(doc(db, 'leads', lId));
    } catch(err) {
      console.error(err);
    }
  };

  // Filter and organize lists according to Doctor, Date, and Time
  const filteredBookings = bookings.filter(b => {
    const search = bookingSearch.toLowerCase();
    const matchesSearch = (
      (b.name || '').toLowerCase().includes(search) ||
      (b.contactNumber || '').includes(search) ||
      (b.date || '').includes(search) ||
      (b.confirmationId || '').toLowerCase().includes(search) ||
      (b.service || '').toLowerCase().includes(search) ||
      (b.treatment || '').toLowerCase().includes(search) ||
      (b.doctorName || '').toLowerCase().includes(search)
    );

    const matchesDoctor = selectedDoctor === '' || 
      (b.doctorName || 'Prof. Dr. Wahida Khan').toLowerCase().includes(selectedDoctor.toLowerCase());

    const matchesDate = selectedDate === '' || (b.date || '') === selectedDate;

    return matchesSearch && matchesDoctor && matchesDate;
  }).sort((a, b) => {
    // 1. Organize by Doctor Name (A-Z)
    const docA = (a.doctorName || 'Prof. Dr. Wahida Khan').toLowerCase();
    const docB = (b.doctorName || 'Prof. Dr. Wahida Khan').toLowerCase();
    if (docA !== docB) {
      return docA.localeCompare(docB, 'bn-BD', { sensitivity: 'base' });
    }
    
    // 2. Organize Date wise (Chronological booking date)
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    
    // 3. Organize Time wise (Convert to minutes from midnight)
    const timeToMin = (tStr: string): number => {
      if (!tStr) return 0;
      const clean = tStr.trim().toUpperCase();
      // Match "12:30 PM", "3 PM", "2:00 PM - 8:00 PM" (extracts first time)
      const match = clean.match(/^(\d+)(?::(\d+))?\s*(AM|PM)?/);
      if (match) {
        let hrs = parseInt(match[1], 10);
        const mins = match[2] ? parseInt(match[2], 10) : 0;
        const meridian = match[3];
        if (meridian === 'PM' && hrs < 12) hrs += 12;
        if (meridian === 'AM' && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
      }
      return 0;
    };
    return timeToMin(a.time) - timeToMin(b.time);
  });

  const filteredLeads = leads.filter(l => {
    const search = leadSearch.toLowerCase();
    return (
      (l.name || '').toLowerCase().includes(search) ||
      (l.phone || '').includes(search) ||
      (l.interested_service || '').toLowerCase().includes(search) ||
      (l.message || '').toLowerCase().includes(search)
    );
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-purple-950 rounded-2xl shadow-2xl overflow-hidden border border-amber-500/30">
          <div className="p-8 space-y-6">
            <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-300">
              <Lock className="w-6 h-6 text-purple-950" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-serif font-extrabold text-amber-400">Security Gateway</h2>
              <p className="text-purple-200 text-xs font-light">Sparkle Skin, Laser & Aesthetic Centre — Admin Dashboard</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-purple-900/40 text-white rounded-xl border border-purple-800 focus:outline-none focus:ring-1 focus:ring-amber-400 text-sm placeholder-purple-300/40"
                  placeholder="Administrator Password"
                />
              </div>
              
              {loginError && <p className="text-red-400 text-xs text-center font-semibold">{loginError}</p>}
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold py-3 px-4 rounded-xl shadow-lg transition-transform active:scale-95 text-sm"
              >
                Log In Securely
              </button>
            </form>

            <div className="text-center pt-2">
              <Link to="/" className="text-xs text-purple-300 hover:text-amber-400 font-bold transition-colors">
                ← Return to Clinic Webpage
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-purple-100 pb-6 select-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-950 rounded-xl flex items-center justify-center text-amber-400 shadow">
              <LayoutDashboard className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-black text-purple-950 tracking-tight">Clinic Administrator Portal</h1>
              <p className="text-slate-500 text-xs">Sparkle Skin, Laser & Aesthetic Centre, Dhaka</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            <Link 
              to="/" 
              className="px-5 py-2.5 bg-purple-950 hover:bg-purple-900 text-white font-serif font-semibold text-xs rounded-xl shadow-md transition-all border border-amber-500/20"
            >
              ← Back to Clinic Website
            </Link>
          </div>
        </div>

        {/* Dashboard Highlight Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#1D0E30] text-white p-5 rounded-2xl border border-purple-900 shadow-xl flex justify-between items-center">
            <div>
              <span className="block text-xs uppercase text-purple-300 font-semibold tracking-wider">Total Bookings</span>
              <span className="block font-serif text-3xl font-extrabold text-amber-400 mt-1">{bookings.length} Patients</span>
            </div>
            <div className="w-10 h-10 bg-purple-900/50 rounded-xl border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex justify-between items-center">
            <div>
              <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">Inquiries & leads</span>
              <span className="block font-serif text-3xl font-extrabold text-purple-950 mt-1">{leads.length} Inquiries</span>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-900 font-bold">
              <MessageCircle className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm flex justify-between items-center">
            <div>
              <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">Today Schedule</span>
              <span className="block font-serif text-3xl font-extrabold text-purple-950 mt-1">4 PM — 9 PM</span>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Appointments VS Leads Callback) */}
        <div className="flex border-b border-purple-100">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-6 py-3.5 text-sm font-serif font-bold border-b-2 transition-all ${
              activeTab === 'appointments'
                ? 'border-purple-900 text-purple-950 bg-white/50 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Confirmed Appointments ({filteredBookings.length})
          </button>
          
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-6 py-3.5 text-sm font-serif font-bold border-b-2 transition-all ${
              activeTab === 'leads'
                ? 'border-purple-900 text-purple-950 bg-white/50 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Complimentary Leads & Inquiries ({filteredLeads.length})
          </button>
        </div>

        {/* Active Panel Tab 1: Confirmed Appointments */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Search Term Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search Appointments</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Name, phone, or confirm ID..."
                      className="block w-full pl-9 pr-3 py-2 border border-slate-200 bg-slate-50/50 rounded-lg focus:ring-purple-700 focus:border-purple-700 text-xs text-slate-800"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Doctors name Wise Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Doctors name Wise Filter</label>
                  <select
                    className="block w-full px-3 py-2 border border-slate-200 bg-[#FAF9F6] rounded-lg focus:ring-purple-700 focus:border-purple-700 text-xs text-slate-800 font-medium"
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                  >
                    <option value="">All Available Doctors (সব ডাক্তার)</option>
                    <option value="Dr. Silveeya Chowdhury">Dr. Silveeya Chowdhury</option>
                    <option value="Dr. Asma Sharmin">Dr. Asma Sharmin</option>
                    <option value="Dr. Arifur Rahman">Dr. Arifur Rahman</option>
                    <option value="Dr. Ismat Ara Juthi">Dr. Ismat Ara Juthi</option>
                    <option value="Dr. Farzana Rahman Shathi">Dr. Farzana Rahman Shathi</option>
                    <option value="Dr. Manna Salwa Bulbul">Dr. Manna Salwa Bulbul</option>
                    <option value="Prof. Dr. Wahida Khan">Prof. Dr. Wahida Khan</option>
                  </select>
                </div>

                {/* Date wise Filter */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date wise Filter</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="block w-full px-3 py-1.5 border border-slate-200 bg-[#FAF9F6] rounded-lg focus:ring-purple-700 focus:border-purple-700 text-xs text-slate-800 font-mono"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    {selectedDate && (
                      <button
                        onClick={() => setSelectedDate('')}
                        className="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-850 bg-red-50 hover:bg-red-100 rounded-lg font-bold"
                        title="Clear Date Filter"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-white shadow-sm border border-purple-50 rounded-2xl overflow-hidden">
              {loadingBookings ? (
                <div className="p-12 text-center text-slate-500 text-xs font-light">Retrieving active booking registry database snapshots...</div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic">No active treatment bookings filed under this search term.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-[#1D0E30] text-amber-400 text-left">
                      <tr>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Name of Doctor</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Patient Name</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Phone Contacts</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Treatment Care</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Preferred Sched Date</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Age/Sex</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Confirmation ID</th>
                        <th scope="col" className="px-6 py-3.5 text-xs text-center font-serif font-bold uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3.5 text-xs text-center font-serif font-bold uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredBookings.map((b) => {
                        const isConfirmedState = b.status === 'Confirmed' || b.status === 'Confirm';
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-amber-600">
                              {b.doctorName || 'Prof. Dr. Wahida Khan'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-purple-950">
                              {b.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[11px] text-slate-600">Phone: {b.contactNumber}</span>
                              </div>
                              {b.whatsapp && b.whatsapp !== b.contactNumber && (
                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-mono">
                                  whatsapp: {b.whatsapp}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                              {b.service || b.treatment || 'Skin Consultation'}
                              {b.concern && (
                                <span className="block text-[10px] text-slate-400 italic font-light truncate max-w-[150px]">{b.concern}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px]">
                              {b.date} at {b.time}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                              {b.age} Years / {b.gender || 'Not specified'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] font-bold text-purple-900">
                              {b.confirmationId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <select
                                value={isConfirmedState ? 'Confirm' : 'Pending'}
                                onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                                className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-700 transition-colors ${
                                  isConfirmedState
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                <option value="Confirm" className="bg-white text-emerald-800 font-bold">Confirm</option>
                                <option value="Pending" className="bg-white text-amber-800 font-bold">Pending</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button 
                                onClick={() => handleDeleteBooking(b.id)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                title="Delete booking reference"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Panel Tab 2: Callback Leads & Inquiries */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search callback leads/inquiries by patient name, call digits, treatment interest, message..."
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 bg-slate-50/50 rounded-lg focus:ring-purple-700 focus:border-purple-700 text-xs text-slate-800"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white shadow-sm border border-purple-50 rounded-2xl overflow-hidden">
              {loadingLeads ? (
                <div className="p-12 text-center text-slate-500 text-xs font-light">Retrieving complimentary skincare leads...</div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs italic">No prospective clinical callbacks filed under this search query.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-[#1D0E30] text-amber-400 text-left">
                      <tr>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Prospective Client</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Contact Phone</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Treatment Interest</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Callback Slot</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Specific Message Concern</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Registration Date</th>
                        <th scope="col" className="px-6 py-3.5 text-xs font-serif font-bold uppercase tracking-wider">Activity Status</th>
                        <th scope="col" className="px-6 py-3.5 text-xs text-center font-serif font-bold uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredLeads.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-purple-950">
                            {l.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px]">
                            {l.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                            {l.interested_service}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                            {l.preferred_call_time}
                          </td>
                          <td className="px-6 py-4 text-slate-500 max-w-xs break-words">
                            {l.message || 'General skincare consult requested.'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-slate-400">
                            {l.createdAt ? new Date((l.createdAt as any).seconds * 1000).toLocaleDateString() : 'Instant'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              l.lead_status === 'Converted' ? 'bg-emerald-100 text-emerald-800' :
                              l.lead_status === 'Interested' ? 'bg-indigo-150 text-indigo-800 bg-indigo-50 border border-indigo-200' :
                              l.lead_status === 'Contacted' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                              {l.lead_status || 'New'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                            <button
                              onClick={() => handleUpdateLeadStatus(l.id, l.lead_status || 'New')}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg border border-purple-200 transition-colors text-[10px] cursor-pointer"
                              title="Cycle lead status"
                            >
                              Toggle Status
                            </button>
                            <button 
                              onClick={() => handleDeleteLead(l.id)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

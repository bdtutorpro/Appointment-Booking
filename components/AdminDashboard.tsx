import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Calendar, Phone, User, CheckCircle, Clock, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [bookings, setBookings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '900900900') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="p-8">
            <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Admin Access</h2>
            <p className="text-center text-slate-500 mb-8">Please enter the admin password to continue.</p>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                  placeholder="Password"
                />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button
                type="submit"
                className="w-full bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Log In
              </button>
            </form>
            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-teal-600 hover:text-teal-700">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredBookings = bookings.filter(booking => {
    const search = searchTerm.toLowerCase();
    return (
      booking.name?.toLowerCase().includes(search) ||
      booking.whatsapp?.includes(search) ||
      booking.date?.includes(search) ||
      booking.confirmationId?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-slate-500">Manage your appointment bookings</p>
          </div>
          <Link to="/" className="text-teal-600 hover:text-teal-700 font-medium">
             Back to Agent
          </Link>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, phone, date, or confirmation ID..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading bookings...</div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No bookings found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Confirmation ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-teal-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-teal-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">{booking.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-500">
                          <Phone className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                          {booking.whatsapp}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex flex-col space-y-1">
                           <div className="flex items-center">
                             <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                             <span>{booking.date}</span>
                           </div>
                           <div className="flex items-center">
                             <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400" />
                             <span>{booking.time}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                        {booking.confirmationId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                           <CheckCircle className="mr-1 h-3 w-3" />
                           {booking.status}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailConfirmation from './pages/EmailConfirmation';
import PropertyDetail from './pages/PropertyDetail';
import Properties from './pages/Properties';
import { supabase } from './lib/supabase';
import PropertyCard from './components/PropertyCard';

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<AgentDashboard />} />
        </Routes>
        
        <footer className="bg-gray-900 text-white py-20 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-black text-xl">R</span>
                  </div>
                  <span className="text-2xl font-bold tracking-tight">Real Estate Solution</span>
                </div>
                <p className="text-gray-400 max-w-sm mb-8">
                  Nigeria's premier real estate platform connecting agents, owners, and buyers with transparency and trust.
                </p>
                <div className="flex gap-4">
                  {/* Social icons placeholders */}
                  <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"></div>
                  <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"></div>
                  <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-colors cursor-pointer"></div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-bold mb-6">Quick Links</h4>
                <ul className="space-y-4 text-gray-400">
                  <li><Link to="/properties" className="hover:text-white transition-colors">All Properties</Link></li>
                  <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing Plans</Link></li>
                  <li><Link to="/signup" className="hover:text-white transition-colors">Join as Agent</Link></li>
                  <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-bold mb-6">Contact Us</h4>
                <ul className="space-y-4 text-gray-400">
                  <li>Lagos, Nigeria</li>
                  <li>info@realestatesolution.ng</li>
                  <li>+234 800 123 4567</li>
                </ul>
              </div>
            </div>
            
            <div className="pt-12 mt-12 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
              <p>© 2026 Real Estate Solution. All rights reserved.</p>
              <div className="flex gap-8">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

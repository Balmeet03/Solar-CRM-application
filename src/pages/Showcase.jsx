// src/pages/Showcase.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Sun, ShieldCheck, Zap, MapPin, ArrowLeft, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Showcase() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null); // For Detail View

  useEffect(() => {
    const fetchPublicProjects = async () => {
      try {
        const q = query(
          collection(db, 'projects'),
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProjects(list);
      } catch (err) {
        console.error("Error fetching showcase projects:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicProjects();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Showcase...</div>;
  }

  // If a project is clicked, render the Zomato-style Detailed View
  if (selectedProject) {
    const images = selectedProject.images || [selectedProject.thumbnail || 'https://images.unsplash.com/photo-1509391365360-e885fed37eef?auto=format&fit=crop&q=80&w=1200'];
    
    return (
      <div className="min-h-screen bg-slate-950 text-white pb-16">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
          <button
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl hover:bg-amber-500/20 transition"
          >
            <ArrowLeft size={16} /> Back to Showcase
          </button>

          {/* Main Thumbnail & Header */}
          <div className="space-y-4">
            <div className="h-96 w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
              <img 
                src={selectedProject.thumbnail || images[0]} 
                alt={selectedProject.clientName} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/20 to-transparent flex items-end p-8">
                <div>
                  <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                    Featured Installation
                  </span>
                  <h1 className="text-3xl md:text-4xl font-black mt-2">{selectedProject.clientName}</h1>
                  <p className="text-slate-300 text-sm flex items-center gap-1 mt-1">
                    <MapPin size={16} className="text-amber-400" /> {selectedProject.location}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Specs & Image Gallery Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6 bg-slate-900 border border-slate-800 p-6 rounded-3xl h-fit">
              <h3 className="font-bold text-lg text-amber-400 flex items-center gap-2">
                <Zap size={20} /> System Specifications
              </h3>
              <div className="space-y-4 text-xs divide-y divide-slate-800">
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">System Capacity</span>
                  <span className="font-bold text-white font-mono">{selectedProject.systemSizeKw} kW</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Panel Hardware</span>
                  <span className="font-medium text-slate-200">{selectedProject.panelType || 'Monocrystalline 540W'}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Inverter Model</span>
                  <span className="font-medium text-slate-200">{selectedProject.inverterBrand || 'Growatt 5kW'}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-slate-400">Status</span>
                  <span className="text-emerald-400 font-bold">{selectedProject.status || 'Operational'}</span>
                </div>
              </div>

              <Link to="/login" className="w-full block text-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition text-xs">
                Claim Similar Installation
              </Link>
            </div>

            {/* Photo Gallery (Zomato Style) */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ImageIcon size={20} className="text-amber-400" /> Project Photo Gallery
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {images.map((imgUrl, idx) => (
                  <div key={idx} className="h-48 rounded-2xl overflow-hidden border border-slate-800 group">
                    <img 
                      src={imgUrl} 
                      alt={`Gallery ${idx}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Other Featured Projects at Bottom */}
          <div className="space-y-4 pt-12 border-t border-slate-800">
            <h3 className="font-bold text-xl">Other Featured Projects</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {projects.filter(p => p.id !== selectedProject.id).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedProject(p)}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer group hover:border-amber-500/50 transition"
                >
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={p.thumbnail || 'https://images.unsplash.com/photo-1509391365360-e885fed37eef?auto=format&fit=crop&q=80&w=600'} 
                      alt={p.clientName} 
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="p-4 space-y-1">
                    <h4 className="font-bold text-sm">{p.clientName}</h4>
                    <p className="text-[11px] text-slate-400">{p.location} • {p.systemSizeKw} kW</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Showcase Landing View
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Banner */}
      <div className="relative overflow-hidden py-24 px-4 bg-linear-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-4 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-2">
            <Sun size={16} /> Commercial & Residential Solar Excellence
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
            Powering Tomorrow With <span className="text-amber-400">Clean Solar Grid</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
            Explore our state-of-the-art commercial and residential solar installations equipped with real-time telemetry, automated maintenance tracking, and maximum efficiency.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link to="/login" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-8 py-3 rounded-xl text-sm transition shadow-lg">
              Client Portal Login
            </Link>
          </div>
        </div>
      </div>

      {/* Zomato-Style Featured Installations Grid */}
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold">Featured Solar Installations</h2>
            <p className="text-slate-400 text-xs mt-1">Click any project to inspect high-resolution galleries and telemetry</p>
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold">{projects.length} Verified Sites</span>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No public projects published yet. Check back soon!</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((proj) => (
              <div 
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden cursor-pointer group hover:border-amber-500/50 transition duration-300 shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="h-56 overflow-hidden relative">
                    <img 
                      src={proj.thumbnail || 'https://images.unsplash.com/photo-1509391365360-e885fed37eef?auto=format&fit=crop&q=80&w=800'} 
                      alt={proj.clientName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md text-amber-400 border border-amber-500/30 text-xs font-mono font-bold px-3 py-1 rounded-full">
                      {proj.systemSizeKw} kW
                    </div>
                  </div>

                  <div className="p-6 space-y-2">
                    <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition">
                      {proj.clientName}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin size={14} className="text-amber-400" /> {proj.location}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 flex justify-between items-center text-xs border-t border-slate-800/60 mt-4">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={14} /> {proj.status || 'Operational'}
                  </span>
                  <span className="text-amber-400 font-bold group-hover:translate-x-1 transition">
                    View Project &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
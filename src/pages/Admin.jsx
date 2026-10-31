// src/pages/Admin.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ShieldAlert, 
  RotateCcw, 
  Trash2, 
  Trash, 
  RefreshCw, 
  UserCheck, 
  Plus, 
  Check, 
  Filter, 
  ArrowUpDown, 
  Clock, 
  CheckSquare, 
  Square,
  AlertCircle
} from 'lucide-react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'users' | 'tickets' | 'trash'
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [trashedItems, setTrashedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trash Bin Controls State
  const [trashFilter, setTrashFilter] = useState('all'); // 'all' | 'project' | 'user'
  const [trashSort, setTrashSort] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'
  const [autoPurgeDays, setAutoPurgeDays] = useState('30'); // '7' | '14' | '30' | '60'
  const [selectedTrashIds, setSelectedTrashIds] = useState([]);

  // New Project Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [location, setLocation] = useState('');
  const [systemSizeKw, setSystemSizeKw] = useState('');
  const [panelType, setPanelType] = useState('Monocrystalline 540W');
  const [inverterBrand, setInverterBrand] = useState('Growatt 5kW');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  // Fetch all collections
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Projects
      const projSnap = await getDocs(collection(db, 'projects'));
      const activeProj = [];
      const trashedProj = [];

      projSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const item = { 
          id: docSnap.id, 
          type: 'project', 
          displayName: data.clientName || 'Unnamed Installation',
          deletedAt: data.deletedAt || new Date().toISOString(),
          ...data 
        };
        if (data.isDeleted) trashedProj.push(item);
        else activeProj.push(item);
      });

      // 2. Users
      const userSnap = await getDocs(collection(db, 'users'));
      const activeUsersList = [];
      const trashedUsersList = [];

      userSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const item = { 
          id: docSnap.id, 
          type: 'user', 
          displayName: data.name || data.email || 'Registered User',
          deletedAt: data.deletedAt || new Date().toISOString(),
          ...data 
        };
        if (data.isDeleted) trashedUsersList.push(item);
        else activeUsersList.push(item);
      });

      // 3. Tickets
      const ticketSnap = await getDocs(collection(db, 'maintenance_tickets'));
      const ticketList = ticketSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      setProjects(activeProj);
      setUsers(activeUsersList);
      setTickets(ticketList);
      setTrashedItems([...trashedProj, ...trashedUsersList]);
      setSelectedTrashIds([]);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- PROJECT CREATION ---
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!clientName || !systemSizeKw) return;

    try {
      const code = 'SOLAR-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      await addDoc(collection(db, 'projects'), {
        clientName,
        clientEmail: clientEmail.trim().toLowerCase(),
        location: location || 'Maharashtra, India',
        systemSizeKw: parseFloat(systemSizeKw),
        panelType,
        inverterBrand,
        claimCode: code,
        isPublic: true,
        thumbnail: thumbnailUrl || 'https://images.unsplash.com/photo-1509391365360-e885fed37eef?auto=format&fit=crop&q=80&w=800',
        status: 'Operational',
        isDeleted: false,
        createdAt: serverTimestamp()
      });

      setClientName('');
      setClientEmail('');
      setLocation('');
      setSystemSizeKw('');
      setThumbnailUrl('');
      fetchData();
      alert(`Project Created! Claim Code: ${code}`);
    } catch (err) {
      console.error("Create project error:", err);
    }
  };

  // --- TIME-BASED USER BLOCKING ---
  const handleBlockUserDuration = async (userUid, durationDays) => {
    try {
      let blockedUntil = null;
      if (durationDays !== 'indefinite') {
        const days = parseInt(durationDays, 10);
        blockedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      await updateDoc(doc(db, 'users', userUid), {
        isBlocked: true,
        blockedUntil: blockedUntil ? blockedUntil.toISOString() : 'indefinite'
      });

      fetchData();
    } catch (err) {
      console.error("Block user error:", err);
    }
  };

  const handleUnblockUser = async (userUid) => {
    try {
      await updateDoc(doc(db, 'users', userUid), {
        isBlocked: false,
        blockedUntil: null
      });
      fetchData();
    } catch (err) {
      console.error("Unblock user error:", err);
    }
  };

  // --- RESET COOLDOWN LIMITS ---
  const handleResetUserCooldown = async (userUid, userEmail) => {
    if (!window.confirm(`Reset 24h complaint quota to 5/5 for ${userEmail}?`)) return;
    try {
      const q = query(
        collection(db, 'maintenance_tickets'), 
        where('userUid', '==', userUid)
      );
      const snapshot = await getDocs(q);

      const deletePromises = snapshot.docs.map(ticketDoc => 
        deleteDoc(doc(db, 'maintenance_tickets', ticketDoc.id))
      );
      await Promise.all(deletePromises);

      alert(`Cooldown reset for ${userEmail}!`);
      fetchData();
    } catch (err) {
      console.error("Error resetting cooldown:", err);
    }
  };

  // --- SOFT DELETE ---
  const handleSoftDelete = async (collectionName, id) => {
    if (!window.confirm("Move item to Trash Bin?")) return;
    try {
      await updateDoc(doc(db, collectionName, id), {
        isDeleted: true,
        deletedAt: new Date().toISOString()
      });
      fetchData();
    } catch (err) {
      console.error("Soft delete error:", err);
    }
  };

  // --- RESTORE FROM TRASH ---
  const handleRestoreFromTrash = async (collectionName, id) => {
    try {
      const targetCol = collectionName === 'project' ? 'projects' : 'users';
      await updateDoc(doc(db, targetCol, id), {
        isDeleted: false,
        deletedAt: null
      });
      fetchData();
    } catch (err) {
      console.error("Restore error:", err);
    }
  };

  // --- SINGLE PERMANENT DELETE ---
  const handlePermanentDelete = async (type, id) => {
    if (!window.confirm("Permanently delete this item? This action cannot be undone!")) return;
    try {
      const targetCol = type === 'project' ? 'projects' : 'users';
      await deleteDoc(doc(db, targetCol, id));
      fetchData();
    } catch (err) {
      console.error("Permanent delete error:", err);
    }
  };

  // --- BATCH SELECTION HELPERS ---
  const toggleSelectTrashItem = (id) => {
    setSelectedTrashIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // --- BATCH RESTORE SELECTED ---
  const handleRestoreSelected = async () => {
    if (selectedTrashIds.length === 0) return;
    if (!window.confirm(`Restore ${selectedTrashIds.length} selected items?`)) return;

    try {
      const promises = selectedTrashIds.map(id => {
        const item = trashedItems.find(t => t.id === id);
        if (!item) return Promise.resolve();
        const targetCol = item.type === 'project' ? 'projects' : 'users';
        return updateDoc(doc(db, targetCol, id), { isDeleted: false, deletedAt: null });
      });
      await Promise.all(promises);
      fetchData();
    } catch (err) {
      console.error("Batch restore error:", err);
    }
  };

  // --- BATCH DELETE SELECTED PERMANENTLY ---
  const handleDeleteSelectedPermanently = async () => {
    if (selectedTrashIds.length === 0) return;
    if (!window.confirm(`PERMANENTLY delete ${selectedTrashIds.length} selected items? This cannot be undone!`)) return;

    try {
      const promises = selectedTrashIds.map(id => {
        const item = trashedItems.find(t => t.id === id);
        if (!item) return Promise.resolve();
        const targetCol = item.type === 'project' ? 'projects' : 'users';
        return deleteDoc(doc(db, targetCol, id));
      });
      await Promise.all(promises);
      fetchData();
    } catch (err) {
      console.error("Batch permanent delete error:", err);
    }
  };

  // --- PERMANENTLY EMPTY TRASH ---
  const handleEmptyTrash = async () => {
    if (!window.confirm("PERMANENTLY delete ALL items in the Trash Bin?")) return;
    try {
      const promises = trashedItems.map(item => {
        const col = item.type === 'project' ? 'projects' : 'users';
        return deleteDoc(doc(db, col, item.id));
      });
      await Promise.all(promises);
      fetchData();
    } catch (err) {
      console.error("Empty trash error:", err);
    }
  };

  // --- TICKET STATUS TOGGLE ---
  const handleToggleTicketStatus = async (ticketId, currentStatus) => {
    const newStatus = currentStatus === 'Resolved' ? 'Pending' : 'Resolved';
    try {
      await updateDoc(doc(db, 'maintenance_tickets', ticketId), {
        status: newStatus,
        resolvedAt: newStatus === 'Resolved' ? new Date() : null
      });
      fetchData();
    } catch (err) {
      console.error("Error updating ticket status:", err);
    }
  };

  // --- FILTERED & SORTED TRASH ITEMS ---
  const processedTrashItems = useMemo(() => {
    let list = [...trashedItems];

    // Filter by Type
    if (trashFilter !== 'all') {
      list = list.filter(item => item.type === trashFilter);
    }

    // Sort List
    list.sort((a, b) => {
      if (trashSort === 'name-asc') {
        return (a.displayName || '').localeCompare(b.displayName || '');
      }
      if (trashSort === 'name-desc') {
        return (b.displayName || '').localeCompare(a.displayName || '');
      }
      if (trashSort === 'date-asc') {
        return new Date(a.deletedAt) - new Date(b.deletedAt);
      }
      // 'date-desc' default
      return new Date(b.deletedAt) - new Date(a.deletedAt);
    });

    return list;
  }, [trashedItems, trashFilter, trashSort]);

  const allFilteredSelected = processedTrashItems.length > 0 && 
    processedTrashItems.every(i => selectedTrashIds.includes(i.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedTrashIds([]);
    } else {
      setSelectedTrashIds(processedTrashItems.map(i => i.id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header Navigation */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-amber-400" /> Admin Command Center
          </h1>
          <p className="text-slate-400 text-xs mt-1">Full System Governance & Trash Retention Policy Management</p>
        </div>

        <div className="flex gap-2">
          {['projects', 'users', 'tickets', 'trash'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition flex items-center gap-1.5 ${
                activeTab === tab 
                  ? 'bg-amber-500 text-slate-950 shadow-md' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab === 'trash' && <Trash size={14} className={trashedItems.length > 0 ? 'text-red-400' : ''} />}
              {tab} {tab === 'trash' && trashedItems.length > 0 && `(${trashedItems.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: PROJECTS */}
      {activeTab === 'projects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Plus size={18} className="text-amber-500" /> Register New Solar Site
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client / Site Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Tech Park"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Client Email (For Secure Claim)</label>
                <input
                  type="email"
                  placeholder="client@company.com"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacity (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="12.5"
                    value={systemSizeKw}
                    onChange={e => setSystemSizeKw(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="Pune, MH"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thumbnail Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={thumbnailUrl}
                  onChange={e => setThumbnailUrl(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl transition"
              >
                Generate Installation & Claim Code
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Active Installations ({projects.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(p => (
                <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900">{p.clientName}</h4>
                      <p className="text-xs text-slate-500">{p.location} • {p.systemSizeKw} kW</p>
                    </div>
                    <button
                      onClick={() => handleSoftDelete('projects', p.id)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
                      title="Move to Trash"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 font-mono">
                    <p><span className="text-slate-400">Code:</span> <strong className="text-amber-600">{p.claimCode}</strong></p>
                    <p><span className="text-slate-400">Claimed By:</span> {p.claimedByUid ? 'Yes' : 'Unclaimed'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-lg text-slate-900">Registered Accounts & Access Control</h3>

          <div className="divide-y divide-slate-100">
            {users.map(u => (
              <div key={u.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="font-bold text-slate-900">{u.name || 'User'} <span className="text-xs font-normal text-slate-500">({u.email})</span></p>
                  <p className="text-xs text-slate-400">UID: {u.id}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleResetUserCooldown(u.id, u.email)}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <RotateCcw size={14} /> Reset 5/5 Quota
                  </button>

                  {u.isBlocked ? (
                    <button
                      onClick={() => handleUnblockUser(u.id)}
                      className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                    >
                      <UserCheck size={14} /> Unblock User
                    </button>
                  ) : (
                    <select
                      onChange={(e) => e.target.value && handleBlockUserDuration(u.id, e.target.value)}
                      defaultValue=""
                      className="bg-red-50 border border-red-200 text-red-800 text-xs font-semibold px-2 py-1.5 rounded-xl focus:outline-none"
                    >
                      <option value="" disabled>Block Requests...</option>
                      <option value="1">Block for 1 Day</option>
                      <option value="7">Block for 1 Week</option>
                      <option value="30">Block for 1 Month</option>
                      <option value="indefinite">Block Indefinitely</option>
                    </select>
                  )}

                  <button
                    onClick={() => handleSoftDelete('users', u.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition"
                    title="Move User to Trash"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TICKETS */}
      {activeTab === 'tickets' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-slate-900">Service Tickets ({tickets.length})</h3>

          <div className="space-y-3">
            {tickets.map(t => (
              <div key={t.id} className="p-4 rounded-xl border border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{t.clientName} &bull; <span className="text-amber-600">{t.serviceType}</span></h4>
                  <p className="text-xs text-slate-500">{t.userEmail} &bull; {t.notes || 'No extra details'}</p>
                </div>

                <button
                  onClick={() => handleToggleTicketStatus(t.id, t.status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    t.status === 'Resolved' 
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  }`}
                >
                  {t.status === 'Resolved' ? <Check size={14} /> : <RefreshCw size={14} />}
                  {t.status === 'Resolved' ? 'Resolved (Click to Reopen)' : 'Mark as Resolved'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ADVANCED TRASH BIN */}
      {activeTab === 'trash' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Trash className="text-red-500" size={20} /> Trash Bin & Retention Manager
              </h3>
              <p className="text-xs text-slate-500">Filter, sort, batch restore, or schedule automatic trash purging.</p>
            </div>

            {/* Auto Purge Setting & Direct Empty */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                <Clock size={14} className="text-amber-600" />
                <span>Auto-Purge After:</span>
                <select 
                  value={autoPurgeDays} 
                  onChange={(e) => setAutoPurgeDays(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none"
                >
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                </select>
              </div>

              {trashedItems.length > 0 && (
                <button
                  onClick={handleEmptyTrash}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                >
                  Empty Trash ({trashedItems.length})
                </button>
              )}
            </div>
          </div>

          {/* Filters & Sorting Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="font-semibold text-slate-600">Filter:</span>
              {['all', 'project', 'user'].map(type => (
                <button
                  key={type}
                  onClick={() => setTrashFilter(type)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize transition ${
                    trashFilter === type ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {type === 'all' ? 'Show All' : `${type}s Only`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-slate-400" />
              <span className="font-semibold text-slate-600">Sort By:</span>
              <select
                value={trashSort}
                onChange={(e) => setTrashSort(e.target.value)}
                className="bg-white border border-slate-200 font-semibold text-slate-800 px-3 py-1 rounded-lg focus:outline-none"
              >
                <option value="date-desc">Newest Deleted First</option>
                <option value="date-asc">Oldest Deleted First</option>
                <option value="name-asc">Name (A &rarr; Z)</option>
                <option value="name-desc">Name (Z &rarr; A)</option>
              </select>
            </div>
          </div>

          {/* Batch Actions Toolbar */}
          {selectedTrashIds.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex justify-between items-center text-xs">
              <span className="font-bold text-amber-900">
                {selectedTrashIds.length} item(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleRestoreSelected}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Restore Selected
                </button>
                <button
                  onClick={handleDeleteSelectedPermanently}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete Permanently
                </button>
              </div>
            </div>
          )}

          {/* Trashed Items List */}
          {processedTrashItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">No matching items found in Trash Bin.</div>
          ) : (
            <div className="space-y-2">
              {/* Table Header / Select All */}
              <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 border-b border-slate-100">
                <button onClick={toggleSelectAllFiltered} className="flex items-center gap-2 hover:text-slate-700">
                  {allFilteredSelected ? <CheckSquare size={16} className="text-amber-500" /> : <Square size={16} />}
                  <span>Select All Filtered</span>
                </button>
                <span>Deletion Timestamp</span>
              </div>

              {processedTrashItems.map(item => {
                const isSelected = selectedTrashIds.includes(item.id);
                return (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                      isSelected ? 'bg-amber-50/50 border-amber-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleSelectTrashItem(item.id)} className="text-slate-400 hover:text-amber-500">
                        {isSelected ? <CheckSquare size={16} className="text-amber-500" /> : <Square size={16} />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-md ${
                            item.type === 'project' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.type}
                          </span>
                          <strong className="text-xs text-slate-900">{item.displayName}</strong>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.email || item.location || `ID: ${item.id}`}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.deletedAt).toLocaleString()}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRestoreFromTrash(item.type, item.id)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="Restore Item"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.type, item.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 p-1.5 rounded-lg text-xs font-bold transition"
                          title="Delete Permanently"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
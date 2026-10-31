// src/pages/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Zap, ShieldCheck, Key, AlertCircle, CheckCircle2, Wrench, Send, Check, X, ShieldAlert, Clock } from 'lucide-react';
import TelemetryCard from '../components/TelemetryCard';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [claimedProjects, setClaimedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimCodeInput, setClaimCodeInput] = useState('');
  const [claimStatus, setClaimStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showClaimBox, setShowClaimBox] = useState(false);

  // User Profile & Blocked Status Details
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');

  // Maintenance Request Modal State
  const [activeTicketProject, setActiveTicketProject] = useState(null);
  const [ticketReason, setTicketReason] = useState('Panel Cleaning');
  const [ticketNotes, setTicketNotes] = useState('');
  const [ticketError, setTicketError] = useState(null);
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [modalCountdown, setModalCountdown] = useState(3);

  // Timer Ref to cancel active auto-close intervals on manual close (X button)
  const autoCloseTimerRef = useRef(null);

  // Quota & Cooldown Timer States
  const [tickets24hCount, setTickets24hCount] = useState(0);
  const [oldestTicketInWindow, setOldestTicketInWindow] = useState(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);

  const MAX_DAILY_LIMIT = 5;

  // Helper: Evaluate block status from user document data
  const evaluateBlockStatus = (userData) => {
    if (!userData || !userData.isBlocked) {
      setIsUserBlocked(false);
      setBlockMessage('');
      return false;
    }

    const now = new Date();
    if (!userData.blockedUntil) {
      // Indefinite block
      setIsUserBlocked(true);
      setBlockMessage('Your account has been indefinitely blocked from submitting support tickets. Please contact support.');
      return true;
    }

    // Parse blockedUntil timestamp
    const blockedUntilDate = userData.blockedUntil.toDate 
      ? userData.blockedUntil.toDate() 
      : new Date(userData.blockedUntil);

    if (blockedUntilDate > now) {
      // Temporary block still active
      setIsUserBlocked(true);
      setBlockMessage(`Your account is temporarily blocked from submitting tickets until ${blockedUntilDate.toLocaleString()}.`);
      return true;
    } else {
      // Block has expired
      setIsUserBlocked(false);
      setBlockMessage('');
      return false;
    }
  };

  // 1. Fetch user account block status & claimed projects
  const fetchUserDataAndProjects = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        evaluateBlockStatus(userDocSnap.data());
      }

      // Fetch claimed projects
      const q = query(
        collection(db, 'projects'), 
        where('claimedByUid', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClaimedProjects(list);
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDataAndProjects();
  }, [currentUser]);

  // 2. Fetch complaint quota for active project (Includes ALL status: Pending + Resolved)
  const checkComplaintQuota = async (project) => {
    if (!currentUser || !project) return;

    try {
      const q = query(
        collection(db, 'maintenance_tickets'),
        where('projectId', '==', project.id),
        where('userUid', '==', currentUser.uid)
      );

      const snapshot = await getDocs(q);
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentTickets = snapshot.docs
        .map(doc => {
          const data = doc.data();
          let ticketDate = now;
          if (data.createdAt) {
            ticketDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          }
          return { id: doc.id, ...data, parsedDate: ticketDate };
        })
        .filter(t => t.parsedDate > twentyFourHoursAgo)
        .sort((a, b) => b.parsedDate - a.parsedDate);

      setTickets24hCount(recentTickets.length);

      if (recentTickets.length >= MAX_DAILY_LIMIT) {
        const fifthTicket = recentTickets[MAX_DAILY_LIMIT - 1] || recentTickets[recentTickets.length - 1];
        const fifthTicketDate = fifthTicket.parsedDate;
        setOldestTicketInWindow(fifthTicketDate);

        const cooldownEndTime = new Date(fifthTicketDate.getTime() + 24 * 60 * 60 * 1000);
        const remainingSecs = Math.max(0, Math.floor((cooldownEndTime - now) / 1000));
        setTimeRemainingSeconds(remainingSecs);
      } else {
        setOldestTicketInWindow(null);
        setTimeRemainingSeconds(0);
      }
    } catch (err) {
      console.error("Error checking ticket quota:", err);
    }
  };

  // Live Timer Countdown Effect for 24-hour cooldown
  useEffect(() => {
    if (timeRemainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (activeTicketProject) checkComplaintQuota(activeTicketProject);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemainingSeconds]);

  // Helper: Format seconds to HH:MM:SS
  const formatHHMMSS = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Helper: Format Cooldown Completion Time (AM/PM)
  const formatEndTimeAMPM = (startTimeDate) => {
    if (!startTimeDate) return '';
    const endTime = new Date(startTimeDate.getTime() + 24 * 60 * 60 * 1000);
    return endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const openTicketModal = async (project) => {
    if (autoCloseTimerRef.current) {
      clearInterval(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }

    // Re-verify latest block status from Firestore before opening modal
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          evaluateBlockStatus(userDocSnap.data());
        }
      } catch (err) {
        console.error("Error verifying block status:", err);
      }
    }

    setActiveTicketProject(project);
    setTicketSuccess(false);
    setTicketError(null);
    setModalCountdown(3);
    checkComplaintQuota(project);
  };

  const closeModal = () => {
    if (autoCloseTimerRef.current) {
      clearInterval(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setActiveTicketProject(null);
    setTicketSuccess(false);
    setTicketError(null);
    setTicketNotes('');
    setModalCountdown(3);
  };

  const handleClaim = async (e) => {
    e.preventDefault();
    if (!claimCodeInput.trim()) return;

    setSubmitting(true);
    setClaimStatus(null);

    try {
      const formattedCode = claimCodeInput.trim().toUpperCase();
      const q = query(collection(db, 'projects'), where('claimCode', '==', formattedCode));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setClaimStatus({ type: 'error', text: 'Invalid Claim Code. Please double-check and try again.' });
        return;
      }

      const projectDoc = snapshot.docs[0];
      const projectData = projectDoc.data();

      if (projectData.claimedByUid) {
        setClaimStatus({ type: 'error', text: 'This solar project has already been claimed by another account.' });
        return;
      }

      if (projectData.clientEmail && projectData.clientEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
        setClaimStatus({ 
          type: 'error', 
          text: `This installation belongs to ${projectData.clientEmail}. Log in with that email to claim.` 
        });
        return;
      }

      await updateDoc(doc(db, 'projects', projectDoc.id), {
        claimedByUid: currentUser.uid,
        claimedEmail: currentUser.email,
        claimedAt: new Date()
      });

      setClaimStatus({ type: 'success', text: `Successfully linked "${projectData.clientName}" to your dashboard!` });
      setClaimCodeInput('');
      setShowClaimBox(false);
      fetchUserDataAndProjects();
    } catch (err) {
      console.error("Claim error:", err);
      setClaimStatus({ type: 'error', text: 'Failed to claim system. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    if (!activeTicketProject) return;

    // 1. RE-VERIFY ADMIN BLOCK STATUS ON SUBMIT
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const isBlockedNow = evaluateBlockStatus(userDocSnap.data());
        if (isBlockedNow) {
          setTicketError(blockMessage || "Your account has been restricted from lodging service requests.");
          return;
        }
      }
    } catch (err) {
      console.error("Error verifying block status on submit:", err);
    }

    // 2. RE-VERIFY 24-HOUR RATE LIMIT / QUOTA
    if (tickets24hCount >= MAX_DAILY_LIMIT) {
      setTicketError(`Limit reached: You have used all ${MAX_DAILY_LIMIT} complaints for today.`);
      return;
    }

    setSendingTicket(true);
    setTicketError(null);

    try {
      await addDoc(collection(db, 'maintenance_tickets'), {
        projectId: activeTicketProject.id,
        clientName: activeTicketProject.clientName,
        userEmail: currentUser.email,
        userUid: currentUser.uid,
        serviceType: ticketReason,
        notes: ticketNotes,
        status: 'Pending',
        createdAt: serverTimestamp()
      });

      await checkComplaintQuota(activeTicketProject);

      setModalCountdown(3);
      setTicketSuccess(true);

      if (autoCloseTimerRef.current) {
        clearInterval(autoCloseTimerRef.current);
      }

      autoCloseTimerRef.current = setInterval(() => {
        setModalCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(autoCloseTimerRef.current);
            autoCloseTimerRef.current = null;
            closeModal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Maintenance submit error:", err);
      setTicketError('Failed to submit request. Please try again.');
    } finally {
      setSendingTicket(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Solar Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Logged in as {currentUser?.email}</p>
        </div>

        {isUserBlocked ? (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-400" /> Account Restricted
          </div>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <Zap size={16} /> Live System Telemetry
          </div>
        )}
      </div>

      {/* Expandable Secure Claim System */}
      <div className="pt-4 border-t border-slate-200">
        {!showClaimBox ? (
          <button
            onClick={() => setShowClaimBox(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Key size={16} className="text-amber-400" /> + Add New Solar Installation
          </button>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="text-amber-500" size={18} /> Link New Solar Installation
              </h2>
              <button 
                onClick={() => setShowClaimBox(false)} 
                className="text-xs font-semibold text-slate-400 hover:text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg transition"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter your installer provided code to link the installation directly to <strong className="text-slate-800">{currentUser?.email}</strong>.
            </p>

            {claimStatus && (
              <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                claimStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {claimStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {claimStatus.text}
              </div>
            )}

            <form onSubmit={handleClaim} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                placeholder="e.g. SOLAR-X7K9P"
                value={claimCodeInput}
                onChange={(e) => setClaimCodeInput(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition disabled:opacity-50 shrink-0"
              >
                {submitting ? 'Verifying...' : 'Claim System'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Claimed Systems List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="text-amber-500" size={22} /> Your Solar Installations ({claimedProjects.length})
        </h2>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading your systems...</div>
        ) : claimedProjects.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-dashed rounded-2xl text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">No solar installations linked yet.</p>
            <p className="text-xs">Use the claim form above with the claim code generated in your Admin panel!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {claimedProjects.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{item.clientName}</h3>
                    <p className="text-xs text-slate-500">{item.location}</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-500 block">Capacity</span>
                    <span className="font-bold text-slate-900">{item.systemSizeKw} kW</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Panels</span>
                    <span className="font-medium text-slate-800">{item.panelType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Inverter</span>
                    <span className="font-medium text-slate-800">{item.inverterBrand}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Code</span>
                    <span className="font-mono font-bold text-amber-600">{item.claimCode}</span>
                  </div>
                </div>

                <TelemetryCard systemSizeKw={item.systemSizeKw} />

                <button
                  onClick={() => openTicketModal(item)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 border border-slate-200"
                >
                  <Wrench size={14} className="text-amber-600" /> Request Service / Maintenance
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Maintenance Pop-Up Modal */}
      {activeTicketProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 border border-slate-200 shadow-2xl relative overflow-hidden">
            
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition z-10"
              title="Close"
            >
              <X size={18} />
            </button>

            {ticketSuccess ? (
              <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-emerald-100 border-4 border-emerald-500 text-emerald-600 rounded-full flex items-center justify-center shadow-lg transform transition-all scale-110">
                  <Check size={44} className="stroke-3" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-extrabold text-slate-900">Request Submitted!</h3>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Your request for <strong className="text-slate-800">{activeTicketProject.clientName}</strong> has been logged.
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Closing in <strong className="text-amber-600 font-bold">{modalCountdown}</strong> {modalCountdown === 1 ? 'second' : 'seconds'}...
                </p>
              </div>
            ) : isUserBlocked ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 border-2 border-red-300 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-slate-900">Service Requests Restricted</h3>
                  <p className="text-xs text-slate-500">
                    {blockMessage || 'Your account has been restricted by an administrator. You cannot log new service complaints at this time.'}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-full bg-slate-900 text-white font-semibold py-2 rounded-xl text-xs"
                >
                  Understood
                </button>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 pb-3 pr-8 space-y-2">
                  <h3 className="font-bold text-base md:text-lg text-slate-900 flex items-center gap-2">
                    <Wrench className="text-amber-500 shrink-0" size={20} /> Request Maintenance
                  </h3>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <p className="text-slate-500 truncate">
                      Site: <strong className="text-slate-800">{activeTicketProject.clientName}</strong>
                    </p>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      MAX_DAILY_LIMIT - tickets24hCount > 0 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {Math.max(0, MAX_DAILY_LIMIT - tickets24hCount)} / {MAX_DAILY_LIMIT} left today
                    </span>
                  </div>
                </div>

                {tickets24hCount >= MAX_DAILY_LIMIT && timeRemainingSeconds > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2 text-amber-900 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-800">
                      <Clock size={16} /> Daily Limit Reached (5/5)
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      You have submitted 5 complaints in the last 24 hours. Your cooldown is currently active.
                    </p>
                    <div className="bg-white p-3 rounded-xl border border-amber-200 flex justify-between items-center font-mono text-xs">
                      <span>Cooldown Remaining:</span>
                      <span className="font-extrabold text-amber-600 text-sm">{formatHHMMSS(timeRemainingSeconds)}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 text-right">
                      Unlocks at: <strong>{formatEndTimeAMPM(oldestTicketInWindow)}</strong>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleMaintenanceSubmit} className="space-y-4 text-xs">
                    {ticketError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{ticketError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Service Required</label>
                      <select
                        value={ticketReason}
                        onChange={(e) => setTicketReason(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      >
                        <option value="Panel Cleaning">Routine Panel Cleaning</option>
                        <option value="Inverter Check">Inverter Error / Diagnostics</option>
                        <option value="Efficiency Drop">Unexpected Efficiency Drop</option>
                        <option value="General Inspection">Annual Preventive Maintenance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Additional Details / Notes</label>
                      <textarea
                        rows="3"
                        placeholder="Describe any warning lights, noises, or preferred timing..."
                        value={ticketNotes}
                        onChange={(e) => setTicketNotes(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      ></textarea>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={sendingTicket}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Send size={14} /> {sendingTicket ? 'Sending...' : 'Submit Request'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
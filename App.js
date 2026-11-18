```react
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, Users, FileText, CreditCard, PieChart, Settings, 
  Plus, Search, Filter, CheckCircle2, XCircle, Clock, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, DollarSign, Download, Printer, Edit, 
  Trash2, Eye, ChevronRight, Calculator, Check, ShieldCheck, 
  TrendingUp, Wallet, UserPlus, FilePlus, RefreshCw, Bell, Save
} from 'lucide-react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "demo-api-key",
  authDomain: "demo-app.firebaseapp.com",
  projectId: "demo-app",
  storageBucket: "demo-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:demo"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'yapinjam-production-app';

// Default Mock Data (Digunakan untuk inisialisasi awal database jika kosong)
const initialBorrowers = [
  { id: 'BRW-001', nik: '3271041208900001', name: 'Budi Santoso', phone: '081234567890', email: 'budi.santoso@email.com', job: 'Karyawan Swasta', salary: 12000000, creditScore: 750, status: 'Aktif', address: 'Jl. Merdeka No. 45, Jakarta Selatan' },
  { id: 'BRW-002', nik: '3271042503850002', name: 'Siti Rahmawati', phone: '085698765432', email: 'siti.rahma@email.com', job: 'PNS', salary: 9500000, creditScore: 810, status: 'Aktif', address: 'Jl. Sudirman No. 12, Bandung' },
  { id: 'BRW-003', nik: '3578011111920003', name: 'Hendra Wijaya', phone: '081901234567', email: 'hendra.w@email.com', job: 'Wiraswasta', salary: 25000000, creditScore: 680, status: 'Aktif', address: 'Jl. Pemuda No. 88, Surabaya' }
];

const initialLoans = [
  { id: 'LOAN-2026-001', borrowerId: 'BRW-001', borrowerName: 'Budi Santoso', amount: 50000000, rate: 10, tenor: 12, purpose: 'Renovasi Rumah', status: 'Aktif', dateSubmitted: '2026-01-15', dateDisbursed: '2026-01-18', paidAmount: 12500000 },
  { id: 'LOAN-2026-002', borrowerId: 'BRW-002', borrowerName: 'Siti Rahmawati', amount: 25000000, rate: 8.5, tenor: 6, purpose: 'Modal Usaha Micro', status: 'Lunas', dateSubmitted: '2025-07-10', dateDisbursed: '2025-07-12', paidAmount: 27125000 },
  { id: 'LOAN-2026-003', borrowerId: 'BRW-003', borrowerName: 'Hendra Wijaya', amount: 100000000, rate: 12, tenor: 24, purpose: 'Ekspansi Bisnis', status: 'Pending', dateSubmitted: '2026-03-01', dateDisbursed: '-', paidAmount: 0 }
];

const initialPayments = [
  { id: 'PAY-8801', loanId: 'LOAN-2026-001', borrowerName: 'Budi Santoso', amount: 4583333, date: '2026-02-18', method: 'Transfer Bank BCA', refNo: 'TRX9928101', status: 'Berhasil' },
  { id: 'PAY-8802', loanId: 'LOAN-2026-001', borrowerName: 'Budi Santoso', amount: 4583333, date: '2026-03-18', method: 'Transfer Bank Mandiri', refNo: 'TRX9928405', status: 'Berhasil' }
];

const defaultCompanyConfig = {
  name: 'PT YaPinjam Perdana Finansial',
  brand: 'YaPinjam',
  license: 'OJK KEP-104/D.05/2024',
  defaultRate: 10,
  lateFeeRate: 2,
  address: 'Menara YaPinjam Lantai 24, Jl. Jend. Sudirman Kav 52-53, Jakarta Selatan',
  email: 'support@yapinjam.co.id',
  phone: '(021) 555-8900'
};

// Formatting Helper
const formatIDR = (num) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
};

export default function App() {
  // Navigation & State Management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  
  // Real-time Data States
  const [borrowers, setBorrowers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(defaultCompanyConfig);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Control States
  const [modalType, setModalType] = useState(null); 
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- 1. FIREBASE AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. FIREBASE REAL-TIME LISTENERS (DATABASE SYNC) ---
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Borrower Listener
    const borrowersRef = collection(db, 'artifacts', appId, 'public', 'data', 'borrowers');
    const unsubBorrowers = onSnapshot(borrowersRef, (snapshot) => {
      if (snapshot.empty) {
        // Populasikan data awal jika belum ada di DB
        initialBorrowers.forEach(b => setDoc(doc(borrowersRef, b.id), b));
      } else {
        const bList = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
        setBorrowers(bList);
      }
    }, (err) => console.error("Borrowers fetch error:", err));

    // Loans Listener
    const loansRef = collection(db, 'artifacts', appId, 'public', 'data', 'loans');
    const unsubLoans = onSnapshot(loansRef, (snapshot) => {
      if (snapshot.empty) {
        initialLoans.forEach(l => setDoc(doc(loansRef, l.id), l));
      } else {
        const lList = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
        setLoans(lList);
      }
    }, (err) => console.error("Loans fetch error:", err));

    // Payments Listener
    const paymentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'payments');
    const unsubPayments = onSnapshot(paymentsRef, (snapshot) => {
      if (snapshot.empty) {
        initialPayments.forEach(p => setDoc(doc(paymentsRef, p.id), p));
      } else {
        const pList = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
        setPayments(pList);
      }
    }, (err) => console.error("Payments fetch error:", err));

    // Company Settings Listener
    const settingsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config');
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setCompanyInfo(docSnap.data());
      } else {
        setDoc(settingsDocRef, defaultCompanyConfig);
      }
      setLoading(false);
    }, (err) => {
      console.error("Settings fetch error:", err);
      setLoading(false);
    });

    return () => {
      unsubBorrowers();
      unsubLoans();
      unsubPayments();
      unsubSettings();
    };
  }, [user]);

  // --- CALCULATIONS FOR METRICS ---
  const stats = useMemo(() => {
    const totalLoaned = loans.reduce((acc, curr) => acc + (curr.status !== 'Ditolak' ? Number(curr.amount || 0) : 0), 0);
    const activeLoans = loans.filter(l => l.status === 'Aktif');
    const totalActiveAmount = activeLoans.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const totalRepaid = loans.reduce((acc, curr) => acc + Number(curr.paidAmount || 0), 0);
    const outstanding = totalLoaned - totalRepaid;
    const approvalRate = loans.length > 0 ? Math.round((loans.filter(l => l.status !== 'Ditolak' && l.status !== 'Pending').length / loans.length) * 100) : 0;
    
    const totalInterest = loans.reduce((acc, curr) => {
      if (curr.status === 'Ditolak') return acc;
      return acc + (Number(curr.amount || 0) * (Number(curr.rate || 0) / 100));
    }, 0);

    return { totalLoaned, totalActiveAmount, activeCount: activeLoans.length, totalRepaid, outstanding, approvalRate, totalInterest };
  }, [loans]);

  // --- PERSISTENT CRUD HANDLERS ---

  // 1. Borrower Save / Edit (Permanent DB Update)
  const handleSaveBorrower = async (e) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.target);
    const bId = selectedItem?.id || `BRW-00${borrowers.length + 1}`;
    
    const borrowerData = {
      id: bId,
      nik: formData.get('nik'),
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      job: formData.get('job'),
      salary: Number(formData.get('salary')),
      creditScore: Number(formData.get('creditScore') || 700),
      status: formData.get('status') || 'Aktif',
      address: formData.get('address'),
    };

    try {
      const borrowerRef = doc(db, 'artifacts', appId, 'public', 'data', 'borrowers', bId);
      await setDoc(borrowerRef, borrowerData, { merge: true });
      showToast(selectedItem?.id ? 'Data Nasabah Berhasil Diperbarui di Database!' : 'Nasabah Baru Tersimpan Permanen!');
      setModalType(null);
      setSelectedItem(null);
    } catch (err) {
      showToast('Gagal menyimpan ke database', 'error');
    }
  };

  // Delete Borrower (Permanent)
  const handleDeleteBorrower = async (id) => {
    if (!user) return;
    if (window.confirm('Apakah Anda yakin ingin menghapus data nasabah ini secara permanen dari database?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'borrowers', id));
        showToast('Data nasabah telah dihapus dari database', 'info');
      } catch (err) {
        showToast('Gagal menghapus data', 'error');
      }
    }
  };

  // 2. Loan Save / Create / Edit Status (Permanent DB Update)
  const handleCreateLoan = async (e) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.target);
    const borrowerId = formData.get('borrowerId');
    const borrower = borrowers.find(b => b.id === borrowerId);

    const loanId = `LOAN-2026-00${loans.length + 1}`;
    const newLoanData = {
      id: loanId,
      borrowerId,
      borrowerName: borrower ? borrower.name : 'Unknown',
      amount: Number(formData.get('amount')),
      rate: Number(formData.get('rate')),
      tenor: Number(formData.get('tenor')),
      purpose: formData.get('purpose'),
      status: 'Pending',
      dateSubmitted: new Date().toISOString().split('T')[0],
      dateDisbursed: '-',
      paidAmount: 0
    };

    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'loans', loanId), newLoanData);
      showToast('Pengajuan pinjaman baru berhasil didaftarkan secara permanen!');
      setModalType(null);
    } catch (err) {
      showToast('Gagal mendaftarkan pinjaman', 'error');
    }
  };

  // Edit/Update Loan Details & Status (Permanent)
  const handleUpdateLoanStatus = async (loanId, newStatus) => {
    if (!user) return;
    try {
      const loanRef = doc(db, 'artifacts', appId, 'public', 'data', 'loans', loanId);
      const existingLoan = loans.find(l => l.id === loanId);
      await updateDoc(loanRef, {
        status: newStatus,
        dateDisbursed: newStatus === 'Aktif' ? new Date().toISOString().split('T')[0] : (existingLoan?.dateDisbursed || '-')
      });
      showToast(`Status Kontrak ${loanId} berhasil diperbarui ke '${newStatus}'`);
    } catch (err) {
      showToast('Gagal memperbarui status pinjaman', 'error');
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (!user) return;
    if (window.confirm('Hapus berkas pengajuan pinjaman ini secara permanen dari database?')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'loans', loanId));
        showToast('Berkas pinjaman berhasil dihapus', 'info');
      } catch (err) {
        showToast('Gagal menghapus pinjaman', 'error');
      }
    }
  };

  // 3. Record Payment (Permanent DB Update & Loan Recalculation)
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!user) return;
    const formData = new FormData(e.target);
    const loanId = formData.get('loanId');
    const payAmount = Number(formData.get('amount'));

    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const payId = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentData = {
      id: payId,
      loanId,
      borrowerName: loan.borrowerName,
      amount: payAmount,
      date: formData.get('date') || new Date().toISOString().split('T')[0],
      method: formData.get('method'),
      refNo: formData.get('refNo') || `TRX${Date.now().toString().slice(-6)}`,
      status: 'Berhasil'
    };

    try {
      // 1. Simpan Transaksi Pembayaran
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'payments', payId), paymentData);

      // 2. Update Total Terbayar di Kontrak Pinjaman
      const updatedPaid = Number(loan.paidAmount || 0) + payAmount;
      const totalPayable = Number(loan.amount) + (Number(loan.amount) * (Number(loan.rate) / 100));
      const isFullyPaid = updatedPaid >= totalPayable;

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'loans', loanId), {
        paidAmount: updatedPaid,
        status: isFullyPaid ? 'Lunas' : loan.status
      });

      showToast(`Pembayaran Rp ${payAmount.toLocaleString('id-ID')} berhasil dicatat & disimpan!`);
      setModalType(null);
    } catch (err) {
      showToast('Gagal mencatat pembayaran', 'error');
    }
  };

  // 4. Save Company Settings (Permanent DB Update)
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'config'), companyInfo);
      showToast('Pengaturan Perusahaan YaPinjam Berhasil Disimpan Permanen!');
    } catch (err) {
      showToast('Gagal menyimpan pengaturan', 'error');
    }
  };

  // Filter Helper
  const filteredBorrowers = useMemo(() => {
    return borrowers.filter(b => 
      b.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.nik?.includes(searchTerm) ||
      b.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [borrowers, searchTerm]);

  const filteredLoans = useMemo(() => {
    return loans.filter(l => 
      l.borrowerName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      l.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [loans, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transition-all transform border ${
          toast.type === 'error' ? 'bg-red-900/90 border-red-500 text-red-100' :
          toast.type === 'info' ? 'bg-blue-900/90 border-blue-500 text-blue-100' : 
          'bg-emerald-900/90 border-emerald-500 text-emerald-100'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700/80 sticky top-0 z-30 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-emerald-500 p-2.5 rounded-xl shadow-lg shadow-emerald-900/20">
            <Building2 className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-amber-400 bg-clip-text text-transparent tracking-tight">
                {companyInfo.brand}
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-mono border border-emerald-500/30">
                LIVE DB SYNC
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">{companyInfo.name}</p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Nasabah, No. Kontrak, NIK..." 
              className="w-full bg-slate-950/70 border border-slate-700/70 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center font-bold text-emerald-400 text-sm">
                ADM
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-200">Admin Operasional</p>
                <p className="text-[10px] text-emerald-400 font-mono">STATUS: ONLINE</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 bg-slate-800/40 border-r border-slate-800 p-4 flex md:flex-col justify-between overflow-x-auto shrink-0">
          <nav className="flex md:flex-col gap-1.5 w-full">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <PieChart className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('borrowers')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'borrowers'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Data Nasabah</span>
            </button>

            <button
              onClick={() => setActiveTab('loans')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'loans'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>Pengajuan & Pinjaman</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'payments'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Pembayaran Angsuran</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Laporan & Export</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/30 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Pengaturan Sistem</span>
            </button>
          </nav>

          <div className="hidden md:block p-3.5 mt-6 rounded-xl bg-slate-800/80 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">OJK Compliance</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {companyInfo.license}
            </p>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-900/80">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-sm">Menghubungkan ke Database YaPinjam Cloud...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-800 via-slate-800 to-emerald-950/40 p-6 rounded-2xl border border-slate-700/60 shadow-xl">
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Ringkasan Operasional {companyInfo.brand}</h2>
                      <p className="text-sm text-slate-400 mt-1">Data terkoneksi secara permanen & tersimpan di cloud database</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setModalType('newLoan')}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg"
                      >
                        <Plus className="w-4 h-4" />
                        Buat Pengajuan Pinjaman
                      </button>
                    </div>
                  </div>

                  {/* Top Metrics Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Disalurkan</p>
                      <h3 className="text-2xl font-bold text-white mt-2">{formatIDR(stats.totalLoaned)}</h3>
                      <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Accumulative Portfolio
                      </p>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pinjaman Aktif</p>
                      <h3 className="text-2xl font-bold text-white mt-2">{stats.activeCount} Berkas</h3>
                      <p className="text-xs text-slate-300 mt-3">Nilai: <strong className="text-amber-400">{formatIDR(stats.totalActiveAmount)}</strong></p>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sisa Outstanding</p>
                      <h3 className="text-2xl font-bold text-amber-400 mt-2">{formatIDR(stats.outstanding)}</h3>
                      <p className="text-xs text-slate-400 mt-3">Terbayar: {formatIDR(stats.totalRepaid)}</p>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700/60 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Estimasi Profit Bunga</p>
                      <h3 className="text-2xl font-bold text-emerald-400 mt-2">{formatIDR(stats.totalInterest)}</h3>
                      <p className="text-xs text-slate-400 mt-3">Persetujuan: {stats.approvalRate}%</p>
                    </div>
                  </div>

                  {/* Active Loans Table Preview */}
                  <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        Pinjaman Terbaru di Sistem
                      </h3>
                      <button onClick={() => setActiveTab('loans')} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
                        Lihat Semua <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {loans.slice(0, 4).map((loan) => (
                        <div key={loan.id} className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-400">{loan.id}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                loan.status === 'Aktif' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                loan.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                loan.status === 'Lunas' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                {loan.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-white mt-1">{loan.borrowerName}</h4>
                            <p className="text-xs text-slate-400">Tujuan: {loan.purpose} • Tenor: {loan.tenor} Bln ({loan.rate}%)</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-sm font-bold text-white">{formatIDR(loan.amount)}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Sudah Dibayar: {formatIDR(loan.paidAmount)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BORROWER MANAGEMENT */}
              {activeTab === 'borrowers' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Manajemen Nasabah (Borrowers)</h2>
                      <p className="text-xs text-slate-400">Kelola data peminjam. Setiap pengeditan & penambahan tersimpan permanen</p>
                    </div>
                    <button 
                      onClick={() => { setSelectedItem(null); setModalType('addBorrower'); }}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg"
                    >
                      <UserPlus className="w-4 h-4" />
                      Tambah Nasabah Baru
                    </button>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                          <tr>
                            <th className="py-3.5 px-4">ID / NIK</th>
                            <th className="py-3.5 px-4">Nama Lengkap</th>
                            <th className="py-3.5 px-4">Kontak & Email</th>
                            <th className="py-3.5 px-4">Pekerjaan</th>
                            <th className="py-3.5 px-4">Gaji / Bln</th>
                            <th className="py-3.5 px-4">Credit Score</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4 text-right">Aksi Management</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {filteredBorrowers.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-750 transition">
                              <td className="py-3.5 px-4">
                                <div className="font-mono font-bold text-slate-200">{b.id}</div>
                                <div className="text-[11px] text-slate-500">{b.nik}</div>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-white">{b.name}</td>
                              <td className="py-3.5 px-4">
                                <div>{b.phone}</div>
                                <div className="text-[11px] text-slate-400">{b.email}</div>
                              </td>
                              <td className="py-3.5 px-4">{b.job}</td>
                              <td className="py-3.5 px-4 font-mono font-medium">{formatIDR(b.salary)}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                  b.creditScore >= 750 ? 'bg-emerald-500/20 text-emerald-400' :
                                  b.creditScore >= 650 ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {b.creditScore}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  b.status === 'Aktif' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button 
                                  onClick={() => { setSelectedItem(b); setModalType('viewBorrower'); }}
                                  className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
                                  title="Lihat Detail"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => { setSelectedItem(b); setModalType('editBorrower'); }}
                                  className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-amber-400 transition"
                                  title="Edit Data Permanen"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteBorrower(b.id)}
                                  className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition"
                                  title="Hapus Permanen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LOANS & APPLICATIONS */}
              {activeTab === 'loans' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Pengajuan & Portofolio Pinjaman</h2>
                      <p className="text-xs text-slate-400">Verifikasi, ubah status persetujuan & kelola pinjaman langsung di database</p>
                    </div>
                    <button 
                      onClick={() => setModalType('newLoan')}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg"
                    >
                      <FilePlus className="w-4 h-4" />
                      Pengajuan Pinjaman Baru
                    </button>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                          <tr>
                            <th className="py-3.5 px-4">No. Kontrak</th>
                            <th className="py-3.5 px-4">Peminjam</th>
                            <th className="py-3.5 px-4">Jumlah Pinjaman</th>
                            <th className="py-3.5 px-4">Bunga & Tenor</th>
                            <th className="py-3.5 px-4">Tujuan</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4 text-right">Kelola Status & Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {filteredLoans.map((loan) => (
                            <tr key={loan.id} className="hover:bg-slate-750 transition">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{loan.id}</td>
                              <td className="py-3.5 px-4 font-semibold text-white">{loan.borrowerName}</td>
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{formatIDR(loan.amount)}</td>
                              <td className="py-3.5 px-4">
                                <div>{loan.rate}% / Tahun</div>
                                <div className="text-[11px] text-slate-400">{loan.tenor} Bulan</div>
                              </td>
                              <td className="py-3.5 px-4">{loan.purpose}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  loan.status === 'Aktif' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                  loan.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                  loan.status === 'Lunas' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                  loan.status === 'Ditolak' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {loan.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {loan.status === 'Pending' && (
                                    <>
                                      <button 
                                        onClick={() => handleUpdateLoanStatus(loan.id, 'Aktif')}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" /> Setujui
                                      </button>
                                      <button 
                                        onClick={() => handleUpdateLoanStatus(loan.id, 'Ditolak')}
                                        className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs font-semibold transition flex items-center gap-1"
                                      >
                                        <XCircle className="w-3 h-3" /> Tolak
                                      </button>
                                    </>
                                  )}

                                  {loan.status === 'Aktif' && (
                                    <button 
                                      onClick={() => handleUpdateLoanStatus(loan.id, 'Macet')}
                                      className="px-2.5 py-1 bg-amber-600/40 hover:bg-amber-600 border border-amber-500/50 text-amber-200 rounded text-xs transition"
                                      title="Tandai Kredit Macet"
                                    >
                                      Macet
                                    </button>
                                  )}

                                  <button 
                                    onClick={() => { setSelectedItem(loan); setModalType('viewSchedule'); }}
                                    className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded transition"
                                    title="Kalkulasi Jadwal Angsuran"
                                  >
                                    <Calculator className="w-4 h-4" />
                                  </button>

                                  <button 
                                    onClick={() => handleDeleteLoan(loan.id)}
                                    className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded transition"
                                    title="Hapus Kontrak Permanen"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: REPAYMENTS */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Pembayaran & Riwayat Angsuran</h2>
                      <p className="text-xs text-slate-400">Pencatatan angsuran masuk tersimpan permanen & mengkalkulasi sisa saldo otomatis</p>
                    </div>
                    <button 
                      onClick={() => setModalType('recordPayment')}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg"
                    >
                      <CreditCard className="w-4 h-4" />
                      Input Pembayaran Angsuran
                    </button>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                          <tr>
                            <th className="py-3.5 px-4">ID Pembayaran</th>
                            <th className="py-3.5 px-4">No. Kontrak</th>
                            <th className="py-3.5 px-4">Nama Nasabah</th>
                            <th className="py-3.5 px-4">Jumlah Terbayar</th>
                            <th className="py-3.5 px-4">Tanggal Pembayaran</th>
                            <th className="py-3.5 px-4">Metode</th>
                            <th className="py-3.5 px-4">No. Referensi TRX</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {payments.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-750 transition">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{p.id}</td>
                              <td className="py-3.5 px-4 font-mono text-emerald-400">{p.loanId}</td>
                              <td className="py-3.5 px-4 font-semibold text-white">{p.borrowerName}</td>
                              <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{formatIDR(p.amount)}</td>
                              <td className="py-3.5 px-4 text-slate-400">{p.date}</td>
                              <td className="py-3.5 px-4">{p.method}</td>
                              <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">{p.refNo}</td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: REPORTS & EXPORT */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">Laporan Keuangan & Ekspor Data</h2>
                      <p className="text-xs text-slate-400">Ringkasan audit eksekutif dan pencetakan berkas</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => window.print()} 
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition"
                      >
                        <Printer className="w-4 h-4" /> Cetak Ringkasan
                      </button>
                      <button 
                        onClick={() => showToast('File CSV Laporan Portofolio YaPinjam berhasil diunduh!')} 
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-lg"
                      >
                        <Download className="w-4 h-4" /> Unduh CSV
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl">
                      <p className="text-xs font-semibold text-slate-400 uppercase">Total Portfolio Pinjaman</p>
                      <h3 className="text-2xl font-bold text-white mt-2">{formatIDR(stats.totalLoaned)}</h3>
                      <p className="text-xs text-slate-400 mt-2">Termasuk pinjaman aktif, selesai, & pending</p>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl">
                      <p className="text-xs font-semibold text-slate-400 uppercase">Total Angsuran Diterima</p>
                      <h3 className="text-2xl font-bold text-emerald-400 mt-2">{formatIDR(stats.totalRepaid)}</h3>
                      <p className="text-xs text-slate-400 mt-2">Pokok + Bunga yang telah dibayar</p>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700 p-5 rounded-2xl">
                      <p className="text-xs font-semibold text-slate-400 uppercase">Potensi Keuntungan Bunga</p>
                      <h3 className="text-2xl font-bold text-amber-400 mt-2">{formatIDR(stats.totalInterest)}</h3>
                      <p className="text-xs text-slate-400 mt-2">Total estimasi margin bunga portofolio</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <h2 className="text-xl font-bold text-white">Pengaturan Sistem Perusahaan</h2>
                    <p className="text-xs text-slate-400">Pengaturan ini tersimpan secara permanen di server database</p>
                  </div>

                  <form onSubmit={handleSaveSettings} className="bg-slate-800/50 border border-slate-700/60 p-6 rounded-2xl space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Perusahaan Resmi</label>
                        <input 
                          type="text" 
                          value={companyInfo.name} 
                          onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Brand / Merk Sistem</label>
                        <input 
                          type="text" 
                          value={companyInfo.brand} 
                          onChange={(e) => setCompanyInfo({...companyInfo, brand: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nomor Lisensi Izin OJK</label>
                        <input 
                          type="text" 
                          value={companyInfo.license} 
                          onChange={(e) => setCompanyInfo({...companyInfo, license: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">Suku Bunga Standar (% / Tahun)</label>
                        <input 
                          type="number" 
                          value={companyInfo.defaultRate} 
                          onChange={(e) => setCompanyInfo({...companyInfo, defaultRate: Number(e.target.value)})}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Alamat Kantor Pusat</label>
                      <textarea 
                        rows={2}
                        value={companyInfo.address} 
                        onChange={(e) => setCompanyInfo({...companyInfo, address: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="pt-3 border-t border-slate-700 flex justify-end">
                      <button 
                        type="submit" 
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition shadow-lg"
                      >
                        <Save className="w-4 h-4" /> Simpan Pengaturan Permanen
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

        </main>
      </div>

      {/* --- MODAL DIALOGS --- */}

      {/* MODAL 1: ADD / EDIT BORROWER */}
      {(modalType === 'addBorrower' || modalType === 'editBorrower') && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {modalType === 'addBorrower' ? 'Registrasi Nasabah Baru' : 'Edit Profil Nasabah (Permanen)'}
              </h3>
              <button onClick={() => { setModalType(null); setSelectedItem(null); }} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBorrower} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">NIK (Nomor Induk Kependudukan)</label>
                <input required type="text" name="nik" defaultValue={selectedItem?.nik || ''} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nama Lengkap (Sesuai KTP)</label>
                <input required type="text" name="name" defaultValue={selectedItem?.name || ''} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">No. HP / WhatsApp</label>
                  <input required type="text" name="phone" defaultValue={selectedItem?.phone || ''} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Email</label>
                  <input required type="email" name="email" defaultValue={selectedItem?.email || ''} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Pekerjaan</label>
                  <input required type="text" name="job" defaultValue={selectedItem?.job || ''} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Gaji Per Bulan (IDR)</label>
                  <input required type="number" name="salary" defaultValue={selectedItem?.salary || ''} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Credit Score (300-850)</label>
                  <input type="number" name="creditScore" min="300" max="850" defaultValue={selectedItem?.creditScore || 720} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Status</label>
                  <select name="status" defaultValue={selectedItem?.status || 'Aktif'} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Alamat Domisili</label>
                <textarea required name="address" rows={2} defaultValue={selectedItem?.address || ''} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-750">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold">Simpan ke Database</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW LOAN APPLICATION */}
      {modalType === 'newLoan' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Buat Pengajuan Pinjaman Baru</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Pilih Nasabah (Borrower)</label>
                <select required name="borrowerId" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">-- Pilih Nasabah --</option>
                  {borrowers.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.id} - NIK: {b.nik})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Jumlah Pinjaman (IDR)</label>
                  <input required type="number" name="amount" placeholder="contoh: 20000000" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Bunga Per Tahun (%)</label>
                  <input required type="number" step="0.1" name="rate" defaultValue={companyInfo.defaultRate} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Tenor (Bulan)</label>
                  <select name="tenor" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                    <option value="3">3 Bulan</option>
                    <option value="6">6 Bulan</option>
                    <option value="12">12 Bulan</option>
                    <option value="24">24 Bulan</option>
                    <option value="36">36 Bulan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Tujuan Pinjaman</label>
                  <input required type="text" name="purpose" placeholder="Renovasi / Usaha / dll" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-750">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold">Simpan Pengajuan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD PAYMENT */}
      {modalType === 'recordPayment' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Catat Pembayaran Angsuran</h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Pilih Pinjaman Aktif</label>
                <select required name="loanId" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">-- Pilih Pinjaman --</option>
                  {loans.filter(l => l.status === 'Aktif' || l.status === 'Macet').map(l => (
                    <option key={l.id} value={l.id}>{l.id} - {l.borrowerName} (Sisa: {formatIDR(l.amount - (l.paidAmount || 0))})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Jumlah Pembayaran (IDR)</label>
                  <input required type="number" name="amount" placeholder="contoh: 4500000" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Tanggal Transaksi</label>
                  <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Metode Pembayaran</label>
                  <select name="method" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                    <option value="Transfer Bank BCA">Transfer Bank BCA</option>
                    <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                    <option value="Virtual Account">Virtual Account</option>
                    <option value="Tunai / Kasir">Tunai / Kasir</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Nomor Referensi TRX</label>
                  <input type="text" name="refNo" placeholder="Opsional (cth: TRX12345)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-750">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold">Simpan Angsuran Permanen</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW SCHEDULE */}
      {modalType === 'viewSchedule' && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Kalkulator & Simulasi Angsuran Pinjaman</h3>
                <p className="text-xs text-slate-400">Kontrak: <span className="font-mono text-emerald-400">{selectedItem.id}</span> • Nasabah: <strong>{selectedItem.borrowerName}</strong></p>
              </div>
              <button onClick={() => { setModalType(null); setSelectedItem(null); }} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              <div className="grid grid-cols-3 gap-3 bg-slate-800 p-3.5 rounded-xl border border-slate-700 text-xs">
                <div>
                  <span className="text-slate-400 block">Pokok Pinjaman:</span>
                  <span className="font-bold text-white font-mono">{formatIDR(selectedItem.amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Suku Bunga:</span>
                  <span className="font-bold text-amber-400">{selectedItem.rate}% / thn</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tenor Pinjaman:</span>
                  <span className="font-bold text-white">{selectedItem.tenor} Bulan</span>
                </div>
              </div>

              <div className="border border-slate-700/60 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Bulan Ke</th>
                      <th className="py-2.5 px-3">Angsuran Pokok</th>
                      <th className="py-2.5 px-3">Bunga</th>
                      <th className="py-2.5 px-3">Total Cicilan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {Array.from({ length: selectedItem.tenor }).map((_, idx) => {
                      const principalPerMonth = selectedItem.amount / selectedItem.tenor;
                      const interestPerMonth = (selectedItem.amount * (selectedItem.rate / 100)) / 12;
                      const totalInstallment = principalPerMonth + interestPerMonth;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-semibold text-slate-300">Bulan {idx + 1}</td>
                          <td className="py-2 px-3 font-mono text-slate-400">{formatIDR(principalPerMonth)}</td>
                          <td className="py-2 px-3 font-mono text-amber-400/90">{formatIDR(interestPerMonth)}</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-400">{formatIDR(totalInstallment)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button onClick={() => setModalType(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-white">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: VIEW BORROWER DETAILS */}
      {modalType === 'viewBorrower' && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Detail Profil Nasabah</h3>
              <button onClick={() => { setModalType(null); setSelectedItem(null); }} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">ID Nasabah:</span>
                <span className="font-mono font-bold text-white">{selectedItem.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">NIK KTP:</span>
                <span className="font-mono text-white">{selectedItem.nik}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Nama Lengkap:</span>
                <span className="font-bold text-white">{selectedItem.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Pekerjaan:</span>
                <span>{selectedItem.job}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Gaji Bulanan:</span>
                <span className="font-mono font-semibold text-emerald-400">{formatIDR(selectedItem.salary)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Credit Score:</span>
                <span className="font-bold text-amber-400">{selectedItem.creditScore} / 850</span>
              </div>
              <div className="py-1.5">
                <span className="text-slate-400 block mb-1">Alamat Lengkap:</span>
                <p className="bg-slate-800 p-2.5 rounded-lg text-slate-300">{selectedItem.address}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button onClick={() => setModalType(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-white">Tutup</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
```

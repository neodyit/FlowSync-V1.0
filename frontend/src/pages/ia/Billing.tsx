import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Check, 
  Clock, 
  AlertTriangle, 
  History, 
  FileText, 
  Printer,
  ShieldCheck,
  Loader2,
  RefreshCw,
  X,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  price: string;
  duration_months: number;
  bonus_days: number;
  formatted_bonus_text?: string;
  formatted_total_duration?: string;
  description?: string;
}

interface Transaction {
  id: number;
  plan_name: string;
  amount: string;
  gateway_charge: string;
  invoice_number: string | null;
  transaction_id: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

declare global {
  interface Window {
    Cashfree: any;
  }
}

export default function Billing() {
  const [activeTab, setActiveTab] = useState<'active' | 'plans' | 'history'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'active' || tab === 'plans' || tab === 'history') {
      return tab;
    }
    return 'active';
  });

  const handleTabChange = (tab: 'active' | 'plans' | 'history') => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  };

  const [subStatus, setSubStatus] = useState<any>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification overlay states
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);

  // Checkout states
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [calculatedAmounts, setCalculatedAmounts] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [verifyingTxId, setVerifyingTxId] = useState<string | null>(null);

  // Load Cashfree JS SDK dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch current subscription status
      const resStatus = await fetch(`${import.meta.env.VITE_API_URL}/ia/subscription_status.php?_t=${Date.now()}`, { credentials: 'include' });
      const dataStatus = await resStatus.json();
      if (dataStatus.status === 'success') {
        setSubStatus(dataStatus.data);
      }

      // 2. Fetch active plans
      const resPlans = await fetch(`${import.meta.env.VITE_API_URL}/admin/subscription_plans.php?_t=${Date.now()}`, { credentials: 'include' });
      const dataPlans = await resPlans.json();
      if (dataPlans.status === 'success') {
        setPlans(dataPlans.data.filter((p: any) => p.status === 'active'));
      }

      // 3. Fetch transaction history
      const resTx = await fetch(`${import.meta.env.VITE_API_URL}/ia/billing_history.php?_t=${Date.now()}`, { credentials: 'include' });
      const dataTx = await resTx.json();
      if (dataTx.status === 'success') {
        setTransactions(dataTx.data);
      }

    } catch (err) {
      console.error("Failed to load billing details:", err);
    } finally {
      setLoading(false);
    }
  };

  // Check URL parameters for redirection callback
  const checkRedirectParams = async () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const paymentStatus = params.get('payment_status');

    if (orderId && paymentStatus) {
      setVerifying(true);
      setVerifyingOrderId(orderId);
      setVerificationStatus('verifying');
      setVerificationMessage('Processing secure payment verification callback. Please wait...');

      // Small delay to ensure the database webhook/status has fully processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/payment.php?action=verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId }),
          credentials: 'include'
        });
        const data = await res.json();

        if (data.status === 'success' || paymentStatus === 'success') {
          setVerificationStatus('success');
          setVerificationMessage('Thank you! Your payment was verified and subscription activated successfully.');
          
          window.history.replaceState({}, document.title, window.location.pathname);
          fetchBillingData();

          // Refresh the layout/page to propagate updated status in real-time
          setTimeout(() => {
            setVerifying(false);
            window.location.reload();
          }, 2000);
        } else {
          setVerificationStatus('failed');
          setVerificationMessage(data.message || 'Verification failed. The payment may still be pending.');
        }
      } catch (err) {
        console.error(err);
        setVerificationStatus('failed');
        setVerificationMessage('Connection error occurred. Please retry manually.');
      }
    }
  };

  useEffect(() => {
    fetchBillingData();
    checkRedirectParams();
  }, []);

  const handleManualVerify = async (orderId: string) => {
    if (!orderId || verifyingTxId) return;
    setVerifyingTxId(orderId);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/payment.php?action=verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert('Success! Your payment was verified and subscription activated successfully.');
        fetchBillingData();
        window.location.reload();
      } else {
        alert('Verification Result: ' + (data.message || 'Payment is still pending.'));
      }
    } catch (err: any) {
      console.error(err);
      alert('Verification Error: ' + err.message);
    } finally {
      setVerifyingTxId(null);
    }
  };

  const handleOpenCheckout = async (plan: Plan) => {
    setSelectedPlan(plan);
    setCheckoutLoading(true);
    setCalculatedAmounts(null);
    try {
      // Securely fetch calculator parameters from backend
      const res = await fetch(`${import.meta.env.VITE_API_URL}/coupons.php?plan_id=${plan.id}&_t=${Date.now()}`, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setCalculatedAmounts(data.amounts);
      }
    } catch (err) {
      console.error("Failed to load checkout details:", err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const initPayment = async () => {
    if (!selectedPlan) return;
    try {
      setCheckoutLoading(true);
      
      // Point callback target URL to the special php redirection validator page with Cashfree's {order_id} placeholder
      const redirectVerifyUrl = `${import.meta.env.VITE_API_URL}/payment_verify.php?order_id={order_id}&redirect_to=${encodeURIComponent(window.location.origin + '/ia/billing')}`;

      // Create order securely
      const res = await fetch(`${import.meta.env.VITE_API_URL}/payment.php?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          return_url: redirectVerifyUrl
        }),
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        const payload = data.data;

        if (typeof window.Cashfree !== 'undefined') {
          const cashfree = window.Cashfree({ mode: payload.environment || "sandbox" });
          cashfree.checkout({
            paymentSessionId: payload.payment_session_id,
            redirectTarget: "_self"
          });
        } else {
          alert('Cashfree SDK is not available. Please refresh the page.');
        }
      } else {
        alert(data.message || 'Checkout initiation failed.');
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred during checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin" />
        <p className="text-sm text-slate-500 font-bold">Loading billing details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 relative text-slate-800 dark:text-slate-100">
      
      {/* Verification Overlay */}
      {verifying && (
        <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#110A24] rounded-3xl p-8 max-w-md w-full border border-slate-150 dark:border-violet-500/20 shadow-2xl flex flex-col items-center text-center space-y-6">
            
            {verificationStatus === 'verifying' && (
              <>
                <div className="p-4 bg-violet-50 dark:bg-violet-950/40 rounded-full animate-pulse">
                  <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin" />
                </div>
                <h2 className="text-xl font-black font-display text-slate-800 dark:text-white">Verifying Transaction</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{verificationMessage}</p>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md">ID: {verifyingOrderId}</span>
              </>
            )}

            {verificationStatus === 'success' && (
              <>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-full text-emerald-500">
                  <ShieldCheck className="w-12 h-12" />
                </div>
                <h2 className="text-xl font-black font-display text-slate-800 dark:text-white">Payment Verified</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{verificationMessage}</p>
                <div className="text-xs text-slate-400">Updating workspace modules...</div>
              </>
            )}

            {verificationStatus === 'failed' && (
              <>
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-full text-rose-500">
                  <AlertTriangle className="w-12 h-12" />
                </div>
                <h2 className="text-xl font-black font-display text-slate-800 dark:text-white">Verification Failed</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{verificationMessage}</p>
                
                <div className="flex gap-4 w-full pt-4">
                  <button
                    onClick={() => {
                      setVerifying(false);
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }}
                    className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => verifyingOrderId && handleManualVerify(verifyingOrderId)}
                    className="flex-1 py-3 bg-[#7C3AED] text-white rounded-xl font-bold text-sm hover:bg-violet-750 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight font-display">Billing Portal</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">View active subscription details, renewal licensing plans, and past transaction records.</p>
      </div>

      {/* Responsive Glassmorphism Navigation Tabs */}
      <div className="flex p-1.5 bg-slate-100 dark:bg-[#1A0F35]/40 backdrop-blur border border-slate-200/50 dark:border-violet-500/10 rounded-2xl w-full sm:max-w-md shadow-inner">
        <button
          onClick={() => handleTabChange('active')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'active' 
              ? 'bg-white dark:bg-violet-600 text-[#7C3AED] dark:text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Active Plan
        </button>
        <button
          onClick={() => handleTabChange('plans')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'plans' 
              ? 'bg-white dark:bg-violet-600 text-[#7C3AED] dark:text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          All Plans
        </button>
        <button
          onClick={() => handleTabChange('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            activeTab === 'history' 
              ? 'bg-white dark:bg-violet-600 text-[#7C3AED] dark:text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-8 transition-all duration-300">
        
        {/* Tab 1: Active Plan */}
        {activeTab === 'active' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Active Subscription Details Card */}
            <div className="lg:col-span-2 bg-white dark:bg-[#110A24] rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm p-6 sm:p-8 flex flex-col justify-between space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 text-slate-100/10 dark:text-violet-500/5 pointer-events-none">
                <CreditCard className="w-40 h-40 transform translate-x-12 translate-y-6" />
              </div>
              <div className="space-y-4 z-10">
                <p className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest">Active Plan Info</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white font-display">
                    {subStatus.plan_name || 'Loading Active License...'}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    subStatus.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                    subStatus.status === 'trial' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                    subStatus.status === 'free' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' :
                    subStatus.status === 'lifetime' ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-400' :
                    'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                  }`}>
                    {subStatus.status || 'Checking...'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  All enterprise collaboration resources are unlocked for your academic departments, faculty, and notices scheduling.
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-4 text-xs text-slate-400 z-10">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 dark:text-slate-300">Validity period:</span>
                  <span>{subStatus.start_date || 'N/A'} — {subStatus.final_expiry_date || 'N/A'}</span>
                </div>
                {subStatus.bonus_days > 0 && (
                  <div className="flex items-center gap-1.5 text-[#7C3AED] dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-950/20 px-2 py-0.5 rounded">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Includes {subStatus.bonus_days} Free Bonus Days</span>
                  </div>
                )}
              </div>
            </div>

            {/* Access Status / Remaining Days Card */}
            <div className="bg-white dark:bg-[#110A24] rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm p-6 sm:p-8 flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-violet-100 dark:bg-violet-950/40 text-[#7C3AED] rounded-2xl">
                  <Clock className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Remaining</p>
                  <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white font-display mt-0.5">
                    {subStatus.remaining_days > 9000 
                      ? 'Lifetime Plan' 
                      : subStatus.remaining_days === 0 
                      ? 'Expires Today' 
                      : subStatus.remaining_days < 0 
                      ? `Expired (${Math.abs(subStatus.remaining_days)} Days Ago)`
                      : `${subStatus.remaining_days ?? 0} Days`}
                  </h3>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
                Subscriptions past expiry have a 7-day grace period before entering read-only lock mode.
              </p>
            </div>

          </div>
        )}

        {/* Tab 2: All Plans */}
        {activeTab === 'plans' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div key={p.id} className="bg-white dark:bg-[#110A24] border border-slate-100 dark:border-violet-500/10 rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-200 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#7C3AED]/5 rounded-bl-full transform translate-x-4 -translate-y-4 transition-transform duration-300 group-hover:scale-125" />
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-black text-slate-800 dark:text-white font-display">{p.name}</h4>
                      {p.formatted_bonus_text && (
                        <span className="px-2 py-0.5 bg-violet-100 text-[#7C3AED] dark:bg-violet-950/40 dark:text-violet-400 text-[10px] font-black rounded uppercase tracking-wider">
                          {p.formatted_bonus_text}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-[#7C3AED] dark:text-violet-400 font-display">₹{p.price}</h3>
                      <p className="text-xs text-slate-400 mt-1">{p.formatted_total_duration}</p>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
                      {p.description || 'Access all enterprise college administration tools, notices, statistics, and reports.'}
                    </p>
                  </div>

                  <button 
                    onClick={() => handleOpenCheckout(p)}
                    className="w-full mt-8 py-3 bg-[#7C3AED] hover:bg-violet-750 text-white rounded-xl font-bold transition-all duration-200 shadow-md shadow-[#7C3AED]/10 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                  >
                    Activate License Plan <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: History */}
        {activeTab === 'history' && (
          <div className="bg-white dark:bg-[#110A24] rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#1A0F35]/40 text-left text-xs font-black text-slate-400 uppercase tracking-wider border-b dark:border-slate-800">
                    <th className="p-4">Transaction Ref</th>
                    <th className="p-4">Billing Plan</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Gateway Charge</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b dark:border-slate-800 text-sm text-slate-600 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-violet-950/5 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-slate-400">{tx.transaction_id}</td>
                      <td className="p-4 font-black text-slate-800 dark:text-white">{tx.plan_name}</td>
                      <td className="p-4 font-black">₹{tx.amount}</td>
                      <td className="p-4 text-slate-400">₹{tx.gateway_charge}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                            tx.payment_status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            tx.payment_status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}>
                            {tx.payment_status}
                          </span>
                          {tx.payment_status === 'pending' && (
                            <button
                              onClick={() => handleManualVerify(tx.transaction_id)}
                              disabled={verifyingTxId === tx.transaction_id}
                              className="px-2 py-1 bg-violet-600 hover:bg-violet-750 text-white rounded text-[10px] font-black uppercase disabled:opacity-50 cursor-pointer transition-colors"
                            >
                              {verifyingTxId === tx.transaction_id ? 'Verifying...' : 'Verify'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        {tx.invoice_number ? (
                          <a 
                            href={`${import.meta.env.VITE_API_URL}/ia/invoice_print.php?invoice_number=${tx.invoice_number}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-violet-950/20 rounded-lg text-xs font-black text-[#7C3AED] transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" /> Printable INV
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">Processing...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-sm text-slate-400">No transaction logs available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Checkout Modal (Popup Calculator) */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white dark:bg-[#110A24] p-8 rounded-3xl w-full max-w-md border border-slate-100 dark:border-violet-500/20 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white font-display">Order Checkout</h2>
                <p className="text-xs text-slate-400 mt-1">Verify payment summary details before processing.</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 border-b dark:border-slate-800 pb-4">
              <div className="flex justify-between font-bold text-sm text-slate-600 dark:text-slate-350">
                <span>Base Plan Price</span>
                <span>₹{selectedPlan.price}</span>
              </div>

              {calculatedAmounts ? (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Processing Fee (Gateway)</span>
                    <span>₹{Number(calculatedAmounts.gateway_charge).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Tax & Processing GST</span>
                    <span>₹{Number(calculatedAmounts.tax_amount).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-2 text-xs text-slate-400 animate-pulse">
                  Calculating processing charges...
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-lg font-black text-slate-800 dark:text-white">
              <span>Total Price</span>
              <span className="text-[#7C3AED] dark:text-violet-400 font-display">
                ₹{calculatedAmounts ? Number(calculatedAmounts.total).toFixed(2) : Number(selectedPlan.price).toFixed(2)}
              </span>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                type="button" 
                onClick={() => setSelectedPlan(null)}
                className="flex-1 py-3 border rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={initPayment}
                disabled={checkoutLoading || !calculatedAmounts}
                className="flex-1 py-3 bg-[#7C3AED] hover:bg-violet-750 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Pay Now...
                  </>
                ) : (
                  'Pay Now'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

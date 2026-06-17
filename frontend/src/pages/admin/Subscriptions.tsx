import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertTriangle, 
  TrendingUp, 
  Building2, 
  Clock, 
  Award,
  Search,
  DollarSign,
  Gift,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface Plan {
  id: number;
  name: string;
  price: string;
  duration_months: number;
  bonus_days: number;
  gateway_percentage: string;
  description: string;
  status: 'active' | 'inactive';
  formatted_bonus_text?: string;
  formatted_total_duration?: string;
  features?: string[];
}

interface CollegeSubStatus {
  id: number;
  name: string;
  plan_name: string;
  status: string;
  remaining_days: number;
  final_expiry_date: string;
}

interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: string;
  expiry_date: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

interface Transaction {
  id: number;
  college_name: string;
  plan_name: string;
  amount: string;
  gateway_charge: string;
  transaction_id: string;
  payment_gateway: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export default function Subscriptions() {
  const [activeTab, setActiveTab] = useState<'colleges' | 'plans' | 'coupons' | 'transactions' | 'sandbox'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'colleges' || tab === 'plans' || tab === 'coupons' || tab === 'transactions' || tab === 'sandbox') {
      return tab;
    }
    return 'colleges';
  });

  const handleTabChange = (tab: 'colleges' | 'plans' | 'coupons' | 'transactions' | 'sandbox') => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  };

  // Subscription Page states
  const [metrics, setMetrics] = useState<any>({});
  const [colleges, setColleges] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Sandbox states
  const [sandboxPlanId, setSandboxPlanId] = useState('');
  const [sandboxMonths, setSandboxMonths] = useState('1');
  const [sandboxCouponId, setSandboxCouponId] = useState('');
  const [customCouponCode, setCustomCouponCode] = useState('');
  const [appliedCustomCoupon, setAppliedCustomCoupon] = useState<Coupon | null>(null);

  const applyCustomCoupon = () => {
    if (!customCouponCode) {
      setAppliedCustomCoupon(null);
      return;
    }
    const found = coupons.find(c => c.code === customCouponCode && c.status === 'active');
    if (found) {
      setAppliedCustomCoupon(found);
      setSandboxCouponId(''); // Deselect standard select dropdown
    } else {
      alert('Coupon code is invalid or expired.');
      setAppliedCustomCoupon(null);
    }
  };

  // Calculation formulas for sandbox
  const selectedPlan = plans.find(p => p.id.toString() === sandboxPlanId);
  const calcBasePrice = selectedPlan ? parseFloat(selectedPlan.price) : 0;
  const calcDurationMonths = selectedPlan ? selectedPlan.duration_months : 1;
  
  const currentMonths = parseFloat(sandboxMonths) || 1;
  const calcMultiplier = currentMonths / calcDurationMonths;
  const calcSubtotal = calcBasePrice * calcMultiplier;

  // Coupon mapping
  const activeCouponSelect = coupons.find(c => c.id.toString() === sandboxCouponId);
  const appliedCoupon = appliedCustomCoupon || activeCouponSelect;

  let calcDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      calcDiscount = calcSubtotal * (parseFloat(appliedCoupon.discount_value) / 100);
    } else {
      calcDiscount = Math.min(calcSubtotal, parseFloat(appliedCoupon.discount_value));
    }
  }

  const calcGatewayPercent = selectedPlan ? parseFloat(selectedPlan.gateway_percentage) : 0;
  const calcSubtotalAfterDiscount = Math.max(0, calcSubtotal - calcDiscount);
  const calcGatewayCharge = calcSubtotalAfterDiscount * (calcGatewayPercent / 100);
  const calcTotal = calcSubtotalAfterDiscount + calcGatewayCharge;

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');
  
const AVAILABLE_FEATURES = [
  {
    category: 'Reporting & Analytics',
    features: [
      { key: 'reporting_personalized_faculty', label: 'Personalized Faculty Reports' },
      { key: 'reporting_department', label: 'Departmental Performance Reports' },
      { key: 'reporting_institution', label: 'Institutional Consolidated Reports' },
      { key: 'reporting_historical', label: 'Historical Data Archives' },
      { key: 'reporting_performance_analytics', label: 'Advanced Performance Analytics' }
    ]
  },
  {
    category: 'Season Management',
    features: [
      { key: 'season_management', label: 'Academic Season Creation' },
      { key: 'season_comparison_reports', label: 'Cross-Season Comparison Reports' },
      { key: 'season_historical_analytics', label: 'Historical Season Analytics' },
      { key: 'season_locking', label: 'Season Locking (Freeze Records)' }
    ]
  },
  {
    category: 'Leaderboards',
    features: [
      { key: 'leaderboard_faculty', label: 'Faculty Activity Rankings' },
      { key: 'leaderboard_department', label: 'Department Leaderboards' },
      { key: 'leaderboard_institution_rankings', label: 'Institutional Rankings' },
      { key: 'leaderboard_performance_awards', label: 'Achievement Awards' }
    ]
  },
  {
    category: 'Task Management',
    features: [
      { key: 'task_group', label: 'Task Group Allocations' },
      { key: 'task_broadcast', label: 'Institution-Wide Task Broadcasts' },
      { key: 'task_acceptance_workflow', label: 'Task Acceptance Workflow' },
      { key: 'task_auto_accept', label: 'Forced Auto-Acceptance Mode' },
      { key: 'task_reminder_system', label: 'Automatic Smart Reminders' },
      { key: 'task_deadline_tracking', label: 'Deadline Extension Tracking' },
      { key: 'allow_ia_task_management', label: 'IA Central Task Management' }
    ]
  },
  {
    category: 'Collaboration & Communications',
    features: [
      { key: 'collab_member_visibility', label: 'Faculty Directory Visibility' },
      { key: 'collab_profile_access', label: 'Detailed Profile Access' },
      { key: 'collab_tools', label: 'Collaboration Canvas & Tools' },
      { key: 'notice_popups', label: 'Interactive Notice Popups' },
      { key: 'notice_banners', label: 'Sticky Billboard Banners' },
      { key: 'notice_broadcasts', label: 'Priority Notification Alerts' },
      { key: 'ia_audit_log_visibility', label: 'IA Activity Center (Audit Logs)' }
    ]
  }
];

  // Modals / Actions
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<{
    name: string;
    price: string;
    duration_months: string;
    bonus_days: string;
    gateway_percentage: string;
    description: string;
    status: string;
    features: string[];
  }>({
    name: '',
    price: '',
    duration_months: '',
    bonus_days: '',
    gateway_percentage: '0.00',
    description: '',
    status: 'active',
    features: []
  });

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    expiry_date: '',
    status: 'active'
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCollege, setSelectedCollege] = useState<any | null>(null);
  const [assignForm, setPlanAssignment] = useState({
    plan_id: '',
    start_date: new Date().toISOString().split('T')[0],
    bonus_days: '0'
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subscription_dashboard.php?_t=${Date.now()}`, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setMetrics(data.data.metrics || {});
      }
      
      // Fetch Plans
      const resPlans = await fetch(`${import.meta.env.VITE_API_URL}/admin/subscription_plans.php?_t=${Date.now()}`, { credentials: 'include' });
      const dataPlans = await resPlans.json();
      if (dataPlans.status === 'success') {
        setPlans(dataPlans.data);
      }

      // Fetch Coupons
      const resCoupons = await fetch(`${import.meta.env.VITE_API_URL}/admin/coupons.php?_t=${Date.now()}`, { credentials: 'include' });
      const dataCoupons = await resCoupons.json();
      if (dataCoupons.status === 'success') {
        setCoupons(dataCoupons.data);
      }

      // Fetch Transactions
      const resTx = await fetch(`${import.meta.env.VITE_API_URL}/admin/billing_history.php?_t=${Date.now()}`, { credentials: 'include' });
      const dataTx = await resTx.json();
      if (dataTx.status === 'success') {
        setTransactions(dataTx.data);
      }

      // Fetch Colleges
      const resColl = await fetch(`${import.meta.env.VITE_API_URL}/admin/colleges.php?_t=${Date.now()}`, { credentials: 'include' });
      const dataColl = await resColl.json();
      if (dataColl.status === 'success') {
        const detailedColleges = await Promise.all(dataColl.data.map(async (c: any) => {
          try {
            const statusRes = await fetch(`${import.meta.env.VITE_API_URL}/admin/institution_subscriptions.php?college_id=${c.id}&_t=${Date.now()}`, { credentials: 'include' });
            const statusData = await statusRes.json();
            return {
              id: c.id,
              name: c.name,
              plan_name: statusData.data?.plan_name || 'Trial Period',
              status: statusData.data?.status || 'trial',
              remaining_days: statusData.data?.remaining_days ?? 0,
              final_expiry_date: statusData.data?.final_expiry_date || 'N/A'
            };
          } catch {
            return { id: c.id, name: c.name, plan_name: 'Trial Period', status: 'trial', remaining_days: 0, final_expiry_date: 'N/A' };
          }
        }));
        setColleges(detailedColleges);
      }

    } catch (err) {
      console.error('Failed to load subscription admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPlan 
        ? `${import.meta.env.VITE_API_URL}/admin/subscription_plans.php?id=${editingPlan.id}`
        : `${import.meta.env.VITE_API_URL}/admin/subscription_plans.php`;
        
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planForm),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowPlanModal(false);
        setEditingPlan(null);
        fetchDashboardData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCoupon 
        ? `${import.meta.env.VITE_API_URL}/admin/coupons.php`
        : `${import.meta.env.VITE_API_URL}/admin/coupons.php`;
        
      const method = editingCoupon ? 'PUT' : 'POST';

      const payload = editingCoupon 
        ? { id: editingCoupon.id, ...couponForm }
        : couponForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowCouponModal(false);
        setEditingCoupon(null);
        fetchDashboardData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/institution_subscriptions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          college_id: selectedCollege.id,
          plan_id: assignForm.plan_id,
          start_date: assignForm.start_date,
          bonus_days: assignForm.bonus_days
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowAssignModal(false);
        fetchDashboardData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOverrideStatus = async (collegeId: number, status: string) => {
    const text = status === 'trial' 
      ? 'Are you sure you want to assign a Trial Plan to this college?' 
      : `Are you sure you want to change the status of this college to ${status}?`;
    if (!confirm(text)) return;
    
    try {
      const payload: any = {
        college_id: collegeId,
        status: status
      };
      
      // If setting trial, default start date and expiry (e.g. 14 days from now)
      if (status === 'trial') {
        payload.start_date = new Date().toISOString().split('T')[0];
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 14); // 14 days trial
        payload.expiry_date = expiry.toISOString().split('T')[0];
        payload.bonus_days = 0;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/institution_subscriptions.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchDashboardData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCouponDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/coupons.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchDashboardData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlanDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/subscription_plans.php?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchDashboardData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSubscription = async (college: any) => {
    const nextStatus = college.status === 'suspended' ? 'active' : 'suspended';
    handleOverrideStatus(college.id, nextStatus);
  };

  const filteredColleges = colleges.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white font-display">Subscriptions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configure licensing plans, manage coupons, and monitor active institutions.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#110A24] p-6 rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm flex items-center gap-4 animate-in fade-in duration-300">
          <div className="p-3 bg-violet-100 dark:bg-violet-950/40 text-[#7C3AED] rounded-xl"><Building2 className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-black tracking-wider">Active Colleges</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{metrics.active_institutions ?? 0}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-[#110A24] p-6 rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm flex items-center gap-4 animate-in fade-in duration-400">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-500 rounded-xl"><Clock className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-black tracking-wider">Trial Period</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{metrics.trial_institutions ?? 0}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-[#110A24] p-6 rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm flex items-center gap-4 animate-in fade-in duration-500">
          <div className="p-3 bg-rose-100 dark:bg-rose-950/40 text-rose-500 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-black tracking-wider">Expired Accounts</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{metrics.expired_institutions ?? 0}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-[#110A24] p-6 rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm flex items-center gap-4 animate-in fade-in duration-600">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-black tracking-wider">Monthly Revenue</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">₹{metrics.revenue_this_month ?? 0}</h3>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 overflow-x-auto scrollbar-none whitespace-nowrap pb-2">
        <button 
          onClick={() => handleTabChange('colleges')}
          className={`pb-4 text-sm font-black transition-all ${activeTab === 'colleges' ? 'border-b-2 border-[#7C3AED] text-[#7C3AED]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Institutions
        </button>
        <button 
          onClick={() => handleTabChange('plans')}
          className={`pb-4 text-sm font-black transition-all ${activeTab === 'plans' ? 'border-b-2 border-[#7C3AED] text-[#7C3AED]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Subscription Plans
        </button>
        <button 
          onClick={() => handleTabChange('coupons')}
          className={`pb-4 text-sm font-black transition-all ${activeTab === 'coupons' ? 'border-b-2 border-[#7C3AED] text-[#7C3AED]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Promo Coupons
        </button>
        <button 
          onClick={() => handleTabChange('transactions')}
          className={`pb-4 text-sm font-black transition-all ${activeTab === 'transactions' ? 'border-b-2 border-[#7C3AED] text-[#7C3AED]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Billing Transactions
        </button>
        <button 
          onClick={() => handleTabChange('sandbox')}
          className={`pb-4 text-sm font-black transition-all ${activeTab === 'sandbox' ? 'border-b-2 border-[#7C3AED] text-[#7C3AED]' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Subscription Sandbox
        </button>
      </div>

      {/* Content */}
      {activeTab === 'colleges' && (
        <div className="bg-white dark:bg-[#110A24] rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search colleges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#1A0F35]/40 text-left text-xs font-black text-slate-400 uppercase">
                  <th className="p-4">Institution Name</th>
                  <th className="p-4">Active Plan</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4">Days Left</th>
                  <th className="p-4">Sub Toggle</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredColleges.map((c) => (
                  <tr key={c.id} className="border-b dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-violet-950/10 transition-colors text-sm text-slate-600 dark:text-slate-300">
                    <td className="p-4 font-bold text-slate-880 dark:text-white">{c.name}</td>
                    <td className="p-4">{c.plan_name}</td>
                    <td className="p-4">{c.final_expiry_date}</td>
                    <td className="p-4 font-black">
                      {c.remaining_days > 9000 ? 'Lifetime' : c.remaining_days}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => toggleSubscription(c)}
                        className="text-slate-400 hover:text-[#7C3AED] transition-colors cursor-pointer"
                        title={c.status === 'suspended' ? 'Resume Subscription' : 'Suspend Subscription'}
                      >
                        {c.status === 'suspended' ? (
                          <ToggleLeft className="w-9 h-9 text-slate-400" />
                        ) : (
                          <ToggleRight className="w-9 h-9 text-emerald-500" />
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                        c.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'trial' ? 'bg-amber-100 text-amber-800' :
                        c.status === 'free' ? 'bg-indigo-100 text-indigo-800' :
                        c.status === 'lifetime' ? 'bg-violet-100 text-violet-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => { setSelectedCollege(c); setShowAssignModal(true); }}
                        className="px-3 py-1.5 bg-[#7C3AED] hover:bg-violet-750 text-white rounded-lg text-xs font-bold"
                      >
                        Assign Plan
                      </button>
                      <button 
                        onClick={() => handleOverrideStatus(c.id, 'trial')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold"
                      >
                        Assign Trial
                      </button>
                      <button 
                        onClick={() => handleOverrideStatus(c.id, 'lifetime')}
                        className="px-3 py-1.5 border border-[#7C3AED]/20 dark:border-violet-500/20 text-[#7C3AED] hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg text-xs font-bold"
                      >
                        Lifetime
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => { setEditingPlan(null); setPlanForm({ name: '', price: '', duration_months: '', bonus_days: '', gateway_percentage: '0.00', description: '', status: 'active', features: [] }); setShowPlanModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] hover:bg-violet-750 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Custom Plan
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const rawFeatures = p.features as any;
              const planFeatures = Array.isArray(rawFeatures) 
                ? rawFeatures 
                : (typeof rawFeatures === 'string' && rawFeatures.trim().startsWith('[')
                    ? (() => { try { return JSON.parse(rawFeatures); } catch { return []; } })()
                    : []);

              return (
                <div key={p.id} className="bg-white dark:bg-[#110A24] rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm p-6 relative flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-black text-slate-800 dark:text-white">{p.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                        {p.status}
                      </span>
                    </div>
                    <h4 className="text-3xl font-black text-[#7C3AED] mb-2">₹{p.price}</h4>
                    <p className="text-xs text-slate-400 mb-4">{p.formatted_total_duration}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-4">{p.description || 'No description provided.'}</p>
                    
                    {planFeatures.length > 0 && (
                      <div className="mb-6">
                        <span className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-wider block mb-1.5">
                          Features ({planFeatures.length} Unlocked)
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {planFeatures.slice(0, 3).map((f) => {
                            const allFlatFeatures = AVAILABLE_FEATURES.flatMap(cat => cat.features);
                            const featureObj = allFlatFeatures.find(feat => feat.key === f);
                            return (
                              <span key={f} className="text-[9px] bg-[#EDE9FE]/50 dark:bg-violet-950/40 text-[#4C1D95] dark:text-violet-300 px-2 py-1 rounded-md font-bold truncate max-w-[150px]">
                                {featureObj ? featureObj.label : f}
                              </span>
                            );
                          })}
                          {planFeatures.length > 3 && (
                            <span className="text-[9px] bg-slate-100 dark:bg-violet-950/40 text-[#7C3AED] dark:text-violet-450 px-2 py-1 rounded-md font-black">
                              +{planFeatures.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 border-t dark:border-slate-800 pt-4 mt-auto">
                    <button 
                      onClick={() => { setEditingPlan(p); setPlanForm({ name: p.name, price: p.price, duration_months: p.duration_months.toString(), bonus_days: p.bonus_days.toString(), gateway_percentage: p.gateway_percentage, description: p.description, status: p.status, features: planFeatures }); setShowPlanModal(true); }}
                      className="flex-1 flex justify-center items-center gap-2 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-violet-950/20 rounded-xl text-xs font-bold"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button 
                      onClick={() => handlePlanDelete(p.id)}
                      className="p-2 border border-rose-100 dark:border-rose-950/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button 
              onClick={() => { setEditingCoupon(null); setCouponForm({ code: '', discount_type: 'percentage', discount_value: '', expiry_date: '', status: 'active' }); setShowCouponModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#7C3AED] hover:bg-violet-750 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Coupon Code
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coupons.map((c) => (
              <div key={c.id} className="bg-white dark:bg-[#110A24] rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm p-6 relative flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white font-mono">{c.code}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${c.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-3xl font-black text-emerald-500 mb-2">
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`}
                  </h4>
                  <p className="text-xs text-slate-400 mb-4">
                    Discount Type: {c.discount_type === 'percentage' ? 'Percentage' : 'Flat Off'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Expires on: {c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : 'Never Expires'}
                  </p>
                </div>
                
                <div className="flex gap-2 border-t dark:border-slate-800 pt-4 mt-auto">
                  <button 
                    onClick={() => { setEditingCoupon(c); setCouponForm({ code: c.code, discount_type: c.discount_type, discount_value: c.discount_value, expiry_date: c.expiry_date || '', status: c.status }); setShowCouponModal(true); }}
                    className="flex-1 flex justify-center items-center gap-2 py-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-violet-950/20 rounded-xl text-xs font-bold"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button 
                    onClick={() => handleCouponDelete(c.id)}
                    className="p-2 border border-rose-100 dark:border-rose-950/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-[#110A24] rounded-2xl border border-slate-100 dark:border-violet-500/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#1A0F35]/40 text-left text-xs font-black text-slate-400 uppercase">
                  <th className="p-4">Tx ID / Ref</th>
                  <th className="p-4">College</th>
                  <th className="p-4">Plan Name</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Charges</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
                    <td className="p-4 font-mono text-xs">{tx.transaction_id || 'manual-' + tx.id}</td>
                    <td className="p-4 font-bold text-slate-855 dark:text-white">{tx.college_name}</td>
                    <td className="p-4">{tx.plan_name}</td>
                    <td className="p-4 font-black">₹{tx.amount}</td>
                    <td className="p-4">₹{tx.gateway_charge}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                        tx.payment_status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        tx.payment_status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {tx.payment_status}
                      </span>
                    </td>
                    <td className="p-4">{new Date(tx.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300 text-left">
          {/* Controls Form */}
          <div className="lg:col-span-2 bg-white dark:bg-[#110A24] p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-violet-500/10 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Estimate Pricing</h2>
              <p className="text-xs text-slate-400">Simulate subscription pricing model by combining plans, duration modifiers, and coupon codes.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest mb-1.5">Select Base Plan</label>
                <select 
                  value={sandboxPlanId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setSandboxPlanId(pid);
                    const selected = plans.find(p => p.id.toString() === pid);
                    if (selected) {
                      setSandboxMonths(selected.duration_months.toString());
                    }
                  }}
                  className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 font-bold text-slate-700 dark:text-indigo-200"
                >
                  <option value="">Select Plan...</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id.toString()}>{p.name} - ₹{p.price} ({p.duration_months} months)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest mb-1.5">Quantity (Duration Months)</label>
                  <input 
                    type="number"
                    min="1"
                    value={sandboxMonths}
                    onChange={(e) => setSandboxMonths(e.target.value)}
                    className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 font-bold text-slate-700 dark:text-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest mb-1.5">Select Promo Coupon</label>
                  <select 
                    value={sandboxCouponId}
                    onChange={(e) => {
                      setSandboxCouponId(e.target.value);
                      setAppliedCustomCoupon(null); // Clear custom coupon if standard coupon is selected
                    }}
                    className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 font-bold text-slate-700 dark:text-indigo-200"
                  >
                    <option value="">No Coupon</option>
                    {coupons.map(c => (
                      <option key={c.id} value={c.id.toString()}>{c.code} ({c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`} Off)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[#4C1D95]/60 dark:text-violet-400/60 uppercase tracking-widest mb-1.5">Custom Discount Code (Optional)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="ENTER CODE..."
                    value={customCouponCode}
                    onChange={(e) => setCustomCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 uppercase font-mono font-bold text-slate-755 dark:text-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={applyCustomCoupon}
                    className="px-5 py-3 bg-[#7C3AED] hover:bg-violet-750 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bill Summary Receipt Card */}
          <div className="bg-white dark:bg-[#110A24] p-6 sm:p-8 rounded-3xl border border-slate-100 dark:border-violet-500/10 shadow-lg relative flex flex-col justify-between overflow-hidden">
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pb-3 border-b dark:border-slate-800">Calculation Summary</h3>
              
              <div className="space-y-3 text-sm font-medium">
                <div className="flex justify-between text-slate-500">
                  <span>Base Plan Price:</span>
                  <span className="font-bold text-slate-800 dark:text-white">₹{calcBasePrice.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Scaled Duration Multiplier:</span>
                  <span className="font-bold text-slate-800 dark:text-white">x{calcMultiplier.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-slate-500 border-b dark:border-slate-800 pb-2">
                  <span>Subtotal Price:</span>
                  <span className="font-bold text-slate-800 dark:text-white">₹{calcSubtotal.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-500">
                    <span className="flex items-center gap-1.5 font-bold">
                      Discount ({appliedCoupon.code}):
                    </span>
                    <span className="font-bold">-₹{calcDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500">
                  <span>Gateway Charge ({calcGatewayPercent}%):</span>
                  <span className="font-bold text-slate-800 dark:text-white">₹{calcGatewayCharge.toFixed(2)}</span>
                </div>

                <div className="h-px border-t border-dashed border-slate-200 dark:border-slate-850 my-4" />

                <div className="flex justify-between text-base font-black">
                  <span className="text-slate-800 dark:text-white">Total Estimate:</span>
                  <span className="text-[#7C3AED] dark:text-violet-400 text-lg">₹{calcTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t dark:border-slate-800 flex flex-col gap-2">
              <div className="p-3 bg-violet-50 dark:bg-violet-950/20 text-[#7C3AED] dark:text-violet-400 rounded-2xl text-[10px] font-black uppercase text-center tracking-wider border border-[#7C3AED]/10">
                Sandbox Simulator Mode
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white dark:bg-[#110A24] p-8 rounded-3xl w-full max-w-3xl border border-slate-100 dark:border-violet-500/20 shadow-2xl space-y-6">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {editingPlan ? 'Modify Pricing Plan' : 'Create Pricing Plan'}
            </h2>
            <form onSubmit={handlePlanSubmit} className="space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* Left Column: Basic Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Plan Name</label>
                    <input 
                      type="text" 
                      value={planForm.name}
                      onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                      className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Price (₹)</label>
                      <input 
                        type="number" 
                        value={planForm.price}
                        onChange={(e) => setPlanForm({...planForm, price: e.target.value})}
                        className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Duration (Months)</label>
                      <input 
                        type="number" 
                        value={planForm.duration_months}
                        onChange={(e) => setPlanForm({...planForm, duration_months: e.target.value})}
                        className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Bonus Days</label>
                      <input 
                        type="number" 
                        value={planForm.bonus_days}
                        onChange={(e) => setPlanForm({...planForm, bonus_days: e.target.value})}
                        className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Gateway Charge (%)</label>
                      <input 
                        type="text" 
                        value={planForm.gateway_percentage}
                        onChange={(e) => setPlanForm({...planForm, gateway_percentage: e.target.value})}
                        className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Description</label>
                    <textarea 
                      value={planForm.description}
                      onChange={(e) => setPlanForm({...planForm, description: e.target.value})}
                      className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 h-28"
                    />
                  </div>
                </div>

                {/* Right Column: Feature List */}
                <div className="space-y-4 border-t md:border-t-0 md:border-l md:pl-6 dark:border-slate-800">
                  <h3 className="font-black text-slate-700 dark:text-indigo-200 uppercase text-xs tracking-wider mb-2">Feature Entitlements</h3>
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                    {AVAILABLE_FEATURES.map((cat) => (
                      <div key={cat.category} className="space-y-2">
                        <span className="text-[10px] font-black text-[#7C3AED] dark:text-violet-400 uppercase tracking-widest block border-b dark:border-slate-800 pb-1">
                          {cat.category}
                        </span>
                        <div className="space-y-1.5">
                          {cat.features.map((feat) => {
                            const isChecked = planForm.features.includes(feat.key);
                            return (
                              <label key={feat.key} className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-violet-950/20 cursor-pointer select-none">
                                <input 
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const nextFeatures = e.target.checked 
                                      ? [...planForm.features, feat.key]
                                      : planForm.features.filter(k => k !== feat.key);
                                    setPlanForm({...planForm, features: nextFeatures});
                                  }}
                                  className="mt-0.5 rounded border-slate-350 dark:border-slate-700 text-[#7C3AED] focus:ring-violet-400"
                                />
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{feat.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowPlanModal(false)}
                  className="flex-1 py-3 border rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-violet-950/15 font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-[#7C3AED] hover:bg-violet-750 text-white rounded-xl font-bold cursor-pointer transition-all"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[300]">
          <div className="bg-white dark:bg-[#110A24] p-8 rounded-3xl w-full max-w-md border border-slate-100 dark:border-violet-500/20 shadow-2xl space-y-6">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {editingCoupon ? 'Modify Promo Coupon' : 'Create Promo Coupon'}
            </h2>
            <form onSubmit={handleCouponSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Coupon Code</label>
                <input 
                  type="text" 
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})}
                  className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 uppercase font-mono font-bold"
                  placeholder="WELCOME10"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Type</label>
                  <select 
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({...couponForm, discount_type: e.target.value})}
                    className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 font-bold text-slate-700"
                    required
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Off (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Discount Value</label>
                  <input 
                    type="number" 
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm({...couponForm, discount_value: e.target.value})}
                    className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 font-bold"
                    placeholder="10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Expiry Date (Optional)</label>
                <input 
                  type="date" 
                  value={couponForm.expiry_date}
                  onChange={(e) => setCouponForm({...couponForm, expiry_date: e.target.value})}
                  className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCouponModal(false)}
                  className="flex-1 py-3 border rounded-xl text-slate-500 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-[#7C3AED] hover:bg-violet-750 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedCollege && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-[300]">
          <div className="bg-white dark:bg-[#110A24] p-8 rounded-3xl w-full max-w-md border border-slate-100 dark:border-violet-500/20 shadow-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Assign Subscription Plan</h2>
              <p className="text-xs text-slate-400 mt-1">Select a plan to assign to {selectedCollege.name}.</p>
            </div>
            <form onSubmit={handleAssignSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Choose Plan</label>
                <select 
                  value={assignForm.plan_id}
                  onChange={(e) => setPlanAssignment({...assignForm, plan_id: e.target.value})}
                  className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800 font-bold text-slate-700"
                  required
                >
                  <option value="">Select a plan...</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.price} / {p.duration_months} Months)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Start Date</label>
                <input 
                  type="date" 
                  value={assignForm.start_date}
                  onChange={(e) => setPlanAssignment({...assignForm, start_date: e.target.value})}
                  className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block font-black text-slate-500 uppercase text-xs mb-1.5">Custom Bonus Days</label>
                <input 
                  type="number" 
                  value={assignForm.bonus_days}
                  onChange={(e) => setPlanAssignment({...assignForm, bonus_days: e.target.value})}
                  className="w-full p-3 border rounded-xl dark:bg-[#1A0F35]/25 dark:border-slate-800"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-3 border rounded-xl text-slate-500 hover:bg-slate-50 font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-[#7C3AED] hover:bg-violet-750 text-white rounded-xl font-bold"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

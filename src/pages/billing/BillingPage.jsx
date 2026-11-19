import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Receipt, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Printer, 
  Info,
  Calendar,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import billingService from '../../services/billingService';

export const BillingPage = () => {
  const { hospitalSlug } = useParams();
  const { user } = useAuth();
  const { hospital } = usePortalBranding();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBilling = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await billingService.getMyBills();
        setBills(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load billing history:', err);
        setError('Unable to load billing history. Please check your connection and refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, []);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    bills.forEach((b) => {
      const tot = Number(b.totalAmount) || 0;
      let pd = Number(b.amountPaid) || 0;
      if (Array.isArray(b.payments) && b.payments.length > 0) {
        pd = b.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      }
      const due = b.balanceDue !== undefined ? Number(b.balanceDue) : Math.max(0, tot - pd);

      totalBilled += tot;
      totalPaid += pd;
      totalOutstanding += due;
    });

    return {
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100
    };
  }, [bills]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Financial & Billing History
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Historical invoices, consultation fees, and hospital payment receipts at {hospital?.name || hospitalSlug}.
        </p>
      </div>

      {/* Informational Policy Banner (Strict Change Control Compliance: READ-ONLY) */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-800">Notice for Clinic Settlement:</strong> This financial overview is provided strictly for personal record-keeping, health savings accounts, and insurance reimbursement documentation. All billing settlements, official stamped receipts, and cashless insurance verifications are processed exclusively at the clinic cashier and reception desk.
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Invoiced
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{summary.totalBilled.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{bills.length} bills recorded</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Settled Amount
            </span>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              ₹{summary.totalPaid.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Settled at clinic cashier</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Outstanding Balance
            </span>
            <div className="text-2xl font-black text-amber-600 font-mono">
              ₹{summary.totalOutstanding.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Payable during clinical visit</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-0">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Invoices & Receipts Log
              </h3>
              <p className="text-xs text-slate-400 hidden sm:block">Itemized statements generated by clinic billing</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.print()} className="text-xs">
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              <span>Print Statement</span>
            </Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
              <span>Loading financial statements...</span>
            </div>
          ) : bills.length === 0 ? (
            <div className="p-10 text-center">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 text-xs">No Billing Records Found</h4>
              <p className="text-xs text-slate-400 mt-0.5">Clinic receipts and invoices will be catalogued here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description / Items</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bills.map((bill) => {
                    const tot = Number(bill.totalAmount) || 0;
                    let pd = Number(bill.amountPaid) || 0;
                    if (Array.isArray(bill.payments) && bill.payments.length > 0) {
                      pd = bill.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
                    }
                    const due = bill.balanceDue !== undefined ? Number(bill.balanceDue) : Math.max(0, tot - pd);
                    const isPaid = due === 0 && tot > 0;
                    const isPartial = due > 0 && pd > 0;

                    const dateStr = bill.createdAt
                      ? new Date(bill.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '—';

                    const itemSummary = Array.isArray(bill.items) && bill.items.length > 0
                      ? bill.items.map(it => it.name || it.itemDescription).slice(0, 2).join(', ')
                      : (bill.billType || 'Clinic Consultation');

                    return (
                      <tr key={bill._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {bill.billNumber || `#${bill._id.slice(-6).toUpperCase()}`}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{dateStr}</td>
                        <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                          {itemSummary}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right">
                          ₹{tot.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-600 text-right">
                          ₹{pd.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-right text-slate-700">
                          ₹{due.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' :
                            isPartial ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {isPaid ? 'Settled' : isPartial ? 'Partial' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPage;

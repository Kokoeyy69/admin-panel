'use client';
import { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { AlertTriangle, CheckCircle, XCircle, Flag } from 'lucide-react';
import { MaskedPhone, MaskedEmail } from '@/components/ui/MaskedPhone';
import { approveTransaction, rejectTransaction, flagTransactionFraud } from '@/lib/transactions';
import { Transaction, TransactionStatus } from '@/types/transaction';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KPI Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    success: 0,
    rejected: 0,
    fraud: 0,
    totalVolume: 0,
  });

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('time', 'desc'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        setTransactions(txData);

        // Calculate stats
        setStats({
          total: txData.length,
          pending: txData.filter((tx) => tx.status === 'PENDING').length,
          success: txData.filter((tx) => tx.status === 'SUCCESS').length,
          rejected: txData.filter((tx) => tx.status === 'REJECTED').length,
          fraud: txData.filter((tx) => tx.status === 'FRAUD').length,
          totalVolume: txData.reduce((sum, tx) => sum + (tx.amount || 0), 0),
        });
      },
      (error) => {
        console.error('Firebase listen error:', error);
        setError('Failed to load transactions');
      }
    );

    return () => unsubscribe();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimestamp = (timestamp: { seconds: number; nanoseconds: number }) => {
    return new Date(timestamp.seconds * 1000).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTransactionAction = async (action: 'APPROVE' | 'REJECT' | 'FRAUD') => {
    if (!selectedTx || !reason.trim()) {
      setError('Please provide a reason for this action');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;
      if (action === 'APPROVE') {
        response = await approveTransaction(selectedTx.id, reason);
      } else if (action === 'REJECT') {
        response = await rejectTransaction(selectedTx.id, reason);
      } else {
        response = await flagTransactionFraud(selectedTx.id, reason);
      }

      if (response.success) {
        setSelectedTx(null);
        setReason('');
        setError(null);
        // Note: The transaction list will auto-update via the real-time listener
      } else {
        setError(response.message || 'Action failed');
      }
    } catch (err: any) {
      console.error('Transaction action error:', err);
      setError(err.message || 'An error occurred while processing your request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-amber-100 text-amber-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      case 'FRAUD':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white rounded-xl border shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Volume</p>
          <p className="text-2xl font-bold mt-2">{formatCurrency(stats.totalVolume)}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
          <p className="text-2xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Pending</p>
          <p className="text-2xl font-bold mt-2 text-amber-500">{stats.pending}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Success</p>
          <p className="text-2xl font-bold mt-2 text-green-600">{stats.success}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl shadow-sm">
          <p className="text-sm text-red-600 font-medium flex items-center gap-2">
            <AlertTriangle size={16} /> Fraud
          </p>
          <p className="text-2xl font-bold mt-2 text-red-600">{stats.fraud}</p>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live Transaction Ledger</h2>
          <span className="text-sm text-slate-500">Showing {transactions.length} transactions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 font-medium">TX ID</th>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Time</th>
                <th className="p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Listening for incoming transactions...
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-50 cursor-pointer ${
                      tx.status === 'FRAUD' ? 'bg-purple-50/50' : ''
                    }`}
                    onClick={() => setSelectedTx(tx)}
                  >
                    <td className="p-4 font-mono text-xs">{tx.id.substring(0, 8)}...</td>
                    <td className="p-4">
                      {tx.email && <MaskedEmail email={tx.email} />}
                      {tx.phone && <MaskedPhone phone={tx.phone} />}
                      {!tx.email && !tx.phone && 'Unknown'}
                    </td>
                    <td className="p-4 font-medium">{formatCurrency(tx.amount || 0)}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getStatusColor(tx.status)
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {formatTimestamp(tx.time)}
                    </td>
                    <td className="p-4">
                      {tx.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          className="px-3 py-1 bg-slate-900 text-white rounded text-xs hover:bg-slate-800 transition"
                        >
                          Review
                        </button>
                      )}
                      {tx.status !== 'PENDING' && (
                        <span className="text-xs text-slate-400">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Transaction Details</h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedTx(null);
                  setReason('');
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Transaction ID</p>
                  <p className="font-mono text-sm mt-1">{selectedTx.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <span
                    className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                      getStatusColor(selectedTx.status)
                    }`}
                  >
                    {selectedTx.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Amount</p>
                  <p className="text-lg font-bold mt-1">{formatCurrency(selectedTx.amount || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Time</p>
                  <p className="text-sm mt-1">{formatTimestamp(selectedTx.time)}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <p className="text-sm font-medium">User Information</p>
                {selectedTx.email && (
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <MaskedEmail email={selectedTx.email} />
                  </div>
                )}
                {selectedTx.phone && (
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <MaskedPhone phone={selectedTx.phone} />
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">User ID</p>
                  <p className="text-sm font-mono mt-1">{selectedTx.userId}</p>
                </div>
              </div>

              {/* Action Fields */}
              {selectedTx.status === 'PENDING' && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Reason for Action
                    </label>
                    <textarea
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none min-h-[100px]"
                      placeholder="Enter your reason for this action..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {reason.length} / 10+ characters required
                    </p>
                  </div>
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
              {selectedTx.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTx(null);
                      setReason('');
                      setError(null);
                    }}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransactionAction('APPROVE')}
                    disabled={loading || !reason.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle size={18} /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransactionAction('REJECT')}
                    disabled={loading || !reason.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle size={18} /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransactionAction('FRAUD')}
                    disabled={loading || !reason.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Flag size={18} /> Flag Fraud
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTx(null);
                    setReason('');
                    setError(null);
                  }}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
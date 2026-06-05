/**
 * Custom hook for managing transactions in NeoPay Admin
 * Handles real-time Firestore subscription and transaction state management
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { Transaction, TransactionStatus } from '@/types/transaction';

export interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
}

export function useTransactions(statusFilter?: TransactionStatus) {
  const [state, setState] = useState<TransactionState>({
    transactions: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      // Build the query based on status filter
      let q = query(collection(db, 'transactions'));
      
      if (statusFilter) {
        q = query(q, where('status', '==', statusFilter));
      }
      
      q = query(q, orderBy('time', 'desc'), limit(100));

      // Set up real-time listener
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const transactions = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Transaction[];
          
          setState((prev) => ({
            transactions,
            loading: false,
            error: null,
          }));
        },
        (error) => {
          console.error('Firebase listen error:', error);
          setState((prev) => ({
            ...prev,
            loading: false,
            error,
          }));
        }
      );
    } catch (error) {
      console.error('Error setting up transaction listener:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [statusFilter]);

  return state;
}

export function useTransaction(txId: string) {
  const [state, setState] = useState<{
    transaction: Transaction | null;
    loading: boolean;
    error: Error | null;
  }>({
    transaction: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!txId) return;

    let unsubscribe: (() => void) | undefined;

    try {
      const docRef = doc(db, 'transactions', txId);
      
      unsubscribe = onSnapshot(
        docRef,
        (doc) => {
          if (doc.exists()) {
            setState({
              transaction: { id: doc.id, ...doc.data() } as Transaction,
              loading: false,
              error: null,
            });
          } else {
            setState({
              transaction: null,
              loading: false,
              error: new Error('Transaction not found'),
            });
          }
        },
        (error) => {
          console.error('Firebase listen error:', error);
          setState({
            transaction: null,
            loading: false,
            error,
          });
        }
      );
    } catch (error) {
      console.error('Error setting up transaction listener:', error);
      setState({
        transaction: null,
        loading: false,
        error: error as Error,
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [txId]);

  return state;
}

// Hook for getting transaction statistics (KPIs)
export function useTransactionStats() {
  const [stats, setStats] = useState<{
    total: number;
    pending: number;
    success: number;
    rejected: number;
    fraud: number;
    totalVolume: number;
  }>({
    total: 0,
    pending: 0,
    success: 0,
    rejected: 0,
    fraud: 0,
    totalVolume: 0,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const q = query(collection(db, 'transactions'), limit(10000));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const transactions = snapshot.docs.map((doc) => doc.data() as Transaction);
          
          setStats({
            total: transactions.length,
            pending: transactions.filter((tx) => tx.status === 'PENDING').length,
            success: transactions.filter((tx) => tx.status === 'SUCCESS').length,
            rejected: transactions.filter((tx) => tx.status === 'REJECTED').length,
            fraud: transactions.filter((tx) => tx.status === 'FRAUD').length,
            totalVolume: transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0),
          });
        },
        (error) => {
          console.error('Firebase stats listener error:', error);
        }
      );
    } catch (error) {
      console.error('Error setting up stats listener:', error);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return stats;
}
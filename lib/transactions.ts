/**
 * Cloud Functions client wrapper for NeoPay Admin
 * Provides type-safe callable functions for transaction operations
 */

import { httpsCallable, getFunctions } from 'firebase/functions';
import { TransactionActionRequest, TransactionActionResponse } from '@/types/transaction';

const functions = getFunctions();

/**
 * Approve a pending transaction
 * @param txId - The transaction ID to approve
 * @param reason - The reason for approval (minimum 10 characters)
 * @returns Promise resolving to the action response
 */
export async function approveTransaction(
  txId: string,
  reason: string
): Promise<TransactionActionResponse> {
  const approveFunc = httpsCallable<
    TransactionActionRequest,
    TransactionActionResponse
  >(functions, 'approveTransaction');

  try {
    const result = await approveFunc({ txId, reason });
    return result.data;
  } catch (error: any) {
    console.error('Approve transaction error:', error);
    throw error;
  }
}

/**
 * Reject a pending transaction
 * @param txId - The transaction ID to reject
 * @param reason - The reason for rejection (minimum 10 characters)
 * @returns Promise resolving to the action response
 */
export async function rejectTransaction(
  txId: string,
  reason: string
): Promise<TransactionActionResponse> {
  const rejectFunc = httpsCallable<
    TransactionActionRequest,
    TransactionActionResponse
  >(functions, 'rejectTransaction');

  try {
    const result = await rejectFunc({ txId, reason });
    return result.data;
  } catch (error: any) {
    console.error('Reject transaction error:', error);
    throw error;
  }
}

/**
 * Flag a transaction as fraudulent
 * @param txId - The transaction ID to flag
 * @param reason - The reason for flagging (minimum 20 characters)
 * @returns Promise resolving to the action response
 */
export async function flagTransactionFraud(
  txId: string,
  reason: string
): Promise<TransactionActionResponse> {
  const flagFunc = httpsCallable<
    TransactionActionRequest,
    TransactionActionResponse
  >(functions, 'flagTransactionFraud');

  try {
    const result = await flagFunc({ txId, reason });
    return result.data;
  } catch (error: any) {
    console.error('Flag fraud error:', error);
    throw error;
  }
}
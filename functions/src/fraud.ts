/**
 * Fraud detection and flagging functions for NeoPay
 * SECURITY: Requires admin role for fraud flagging
 * COMPLIANCE: All fraud flags are immutably logged
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { 
  TransactionActionRequest, 
  TransactionActionResponse,
  Transaction,
  TransactionStatus 
} from './types';
import { createAuditLog, validateAdminRole } from './audit';

const db = admin.firestore();

/**
 * Flag a transaction as fraudulent
 * SECURITY: Requires 'admin' role only
 * ATOMICITY: Uses Firestore transaction to ensure audit log is written
 * CRITICAL: Fraud flags cannot be reversed without super-admin intervention
 */
export const flagTransactionFraud = onCall(
  async (request): Promise<TransactionActionResponse> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to flag fraud'
      );
    }

    const { txId, reason } = request.data as TransactionActionRequest;

    if (!txId || !reason) {
      throw new HttpsError(
        'invalid-argument',
        'Transaction ID and reason are required'
      );
    }

    if (reason.length < 20) {
      throw new HttpsError(
        'invalid-argument',
        'Fraud flag reason must be at least 20 characters with specific details'
      );
    }

    try {
      // Only admins can flag fraud
      const adminEmail = await validateAdminRole(request.auth.uid, ['admin']);

      const result = await db.runTransaction(async (transaction) => {
        const txRef = db.collection('transactions').doc(txId);
        const txDoc = await transaction.get(txRef);

        if (!txDoc.exists) {
          throw new Error('Transaction not found');
        }

        const txData = txDoc.data() as Transaction;
        const previousState = txData.status;
        const newState: TransactionStatus = 'FRAUD';

        // Update transaction to FRAUD status
        transaction.update(txRef, {
          status: newState,
          flaggedBy: request.auth!.uid,
          flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
          fraudReason: reason,
          // Add to fraud watchlist
          fraudMetadata: {
            userId: txData.userId,
            amount: txData.amount,
            flaggedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
        });

        // Create audit log
        createAuditLog(
          transaction,
          txId,
          request.auth!.uid,
          adminEmail,
          'FLAG_FRAUD',
          previousState,
          newState,
          reason,
          {
            ipAddress: request.rawRequest?.ip,
            userAgent: request.rawRequest?.headers['user-agent'],
          }
        );

        // Also flag the user for review
        const userRef = db.collection('users').doc(txData.userId);
        transaction.update(userRef, {
          fraudFlagCount: admin.firestore.FieldValue.increment(1),
          lastFraudFlag: admin.firestore.FieldValue.serverTimestamp(),
          requiresReview: true,
        });

        return {
          ...txData,
          id: txId,
          status: newState,
        };
      });

      return {
        success: true,
        message: 'Transaction flagged as fraud successfully',
        transaction: result,
      };
    } catch (error: any) {
      console.error('Flag fraud error:', error);
      
      if (error.message.includes('not found')) {
        throw new HttpsError('not-found', error.message);
      }
      if (error.message.includes('Unauthorized')) {
        throw new HttpsError('permission-denied', error.message);
      }

      throw new HttpsError('internal', 'Failed to flag transaction as fraud');
    }
  }
);
/**
 * Transaction management Cloud Functions for NeoPay
 * SECURITY: All mutations are atomic and include audit logging
 * COMPLIANCE: RBAC enforced via custom claims
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
 * Approve a pending transaction
 * SECURITY: Requires 'admin' or 'manager' role
 * ATOMICITY: Uses Firestore transaction to ensure audit log is written
 */
export const approveTransaction = onCall(
  async (request): Promise<TransactionActionResponse> => {
    // Authentication check
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to approve transactions'
      );
    }

    const { txId, reason } = request.data as TransactionActionRequest;

    // Input validation
    if (!txId || !reason) {
      throw new HttpsError(
        'invalid-argument',
        'Transaction ID and reason are required'
      );
    }

    if (reason.length < 10) {
      throw new HttpsError(
        'invalid-argument',
        'Reason must be at least 10 characters'
      );
    }

    try {
      // RBAC validation
      const adminEmail = await validateAdminRole(request.auth.uid, ['admin', 'manager']);

      // Atomic transaction
      const result = await db.runTransaction(async (transaction) => {
        const txRef = db.collection('transactions').doc(txId);
        const txDoc = await transaction.get(txRef);

        if (!txDoc.exists) {
          throw new Error('Transaction not found');
        }

        const txData = txDoc.data() as Transaction;

        // Business rule validation
        if (txData.status !== 'PENDING') {
          throw new Error(
            `Transaction is in ${txData.status} state and cannot be approved`
          );
        }

        const previousState = txData.status;
        const newState: TransactionStatus = 'SUCCESS';

        // Update transaction status
        transaction.update(txRef, {
          status: newState,
          approvedBy: request.auth!.uid,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvalReason: reason,
        });

        // Create audit log atomically
        createAuditLog(
          transaction,
          txId,
          request.auth!.uid,
          adminEmail,
          'APPROVE',
          previousState,
          newState,
          reason,
          {
            ipAddress: request.rawRequest?.ip,
            userAgent: request.rawRequest?.headers['user-agent'],
          }
        );

        return {
          ...txData,
          id: txId,
          status: newState,
        };
      });

      return {
        success: true,
        message: 'Transaction approved successfully',
        transaction: result,
      };
    } catch (error: any) {
      console.error('Approve transaction error:', error);
      
      if (error.message.includes('not found')) {
        throw new HttpsError('not-found', error.message);
      }
      if (error.message.includes('Unauthorized')) {
        throw new HttpsError('permission-denied', error.message);
      }
      if (error.message.includes('cannot be approved')) {
        throw new HttpsError('failed-precondition', error.message);
      }

      throw new HttpsError('internal', 'Failed to approve transaction');
    }
  }
);

/**
 * Reject a pending transaction
 * SECURITY: Requires 'admin' or 'analyst' role
 * ATOMICITY: Uses Firestore transaction to ensure audit log is written
 */
export const rejectTransaction = onCall(
  async (request): Promise<TransactionActionResponse> => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to reject transactions'
      );
    }

    const { txId, reason } = request.data as TransactionActionRequest;

    if (!txId || !reason) {
      throw new HttpsError(
        'invalid-argument',
        'Transaction ID and reason are required'
      );
    }

    if (reason.length < 10) {
      throw new HttpsError(
        'invalid-argument',
        'Reason must be at least 10 characters'
      );
    }

    try {
      const adminEmail = await validateAdminRole(request.auth.uid, ['admin', 'analyst', 'manager']);

      const result = await db.runTransaction(async (transaction) => {
        const txRef = db.collection('transactions').doc(txId);
        const txDoc = await transaction.get(txRef);

        if (!txDoc.exists) {
          throw new Error('Transaction not found');
        }

        const txData = txDoc.data() as Transaction;

        if (txData.status !== 'PENDING') {
          throw new Error(
            `Transaction is in ${txData.status} state and cannot be rejected`
          );
        }

        const previousState = txData.status;
        const newState: TransactionStatus = 'REJECTED';

        transaction.update(txRef, {
          status: newState,
          rejectedBy: request.auth!.uid,
          rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
          rejectionReason: reason,
        });

        createAuditLog(
          transaction,
          txId,
          request.auth!.uid,
          adminEmail,
          'REJECT',
          previousState,
          newState,
          reason,
          {
            ipAddress: request.rawRequest?.ip,
            userAgent: request.rawRequest?.headers['user-agent'],
          }
        );

        return {
          ...txData,
          id: txId,
          status: newState,
        };
      });

      return {
        success: true,
        message: 'Transaction rejected successfully',
        transaction: result,
      };
    } catch (error: any) {
      console.error('Reject transaction error:', error);
      
      if (error.message.includes('not found')) {
        throw new HttpsError('not-found', error.message);
      }
      if (error.message.includes('Unauthorized')) {
        throw new HttpsError('permission-denied', error.message);
      }
      if (error.message.includes('cannot be rejected')) {
        throw new HttpsError('failed-precondition', error.message);
      }

      throw new HttpsError('internal', 'Failed to reject transaction');
    }
  }
);
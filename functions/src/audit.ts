/**
 * Audit logging utilities for NeoPay
 * All transaction state changes must be logged atomically
 */

import * as admin from 'firebase-admin';
import { AuditLog, AuditAction, TransactionStatus } from './types';

/**
 * Creates an audit log entry atomically within a transaction
 * CRITICAL: This must be called inside a Firestore transaction to ensure atomicity
 * 
 * @param transaction - Firestore transaction object
 * @param txId - Transaction ID being modified
 * @param adminUid - UID of admin performing the action
 * @param adminEmail - Email of admin performing the action
 * @param action - Type of action being performed
 * @param previousState - Transaction status before the action
 * @param newState - Transaction status after the action (optional for reveal actions)
 * @param reason - Reason provided by admin
 * @param context - Optional context (IP, user agent)
 */
export function createAuditLog(
  transaction: FirebaseFirestore.Transaction,
  txId: string,
  adminUid: string,
  adminEmail: string,
  action: AuditAction,
  previousState: TransactionStatus,
  newState: TransactionStatus | undefined,
  reason: string,
  context?: { ipAddress?: string; userAgent?: string }
): void {
  const db = admin.firestore();
  const auditLogRef = db.collection('audit_logs').doc();

  const auditLog: AuditLog = {
    txId,
    adminUid,
    adminEmail,
    action,
    timestamp: admin.firestore.Timestamp.now(),
    reason,
    previousState,
    newState,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
  };

  transaction.set(auditLogRef, auditLog);
}

/**
 * Validates that an admin has the required role
 * 
 * @param adminUid - UID of admin to validate
 * @param requiredRoles - Array of acceptable roles
 * @returns Promise resolving to admin's email if authorized
 * @throws Error if admin lacks required permissions
 */
export async function validateAdminRole(
  adminUid: string,
  requiredRoles: string[]
): Promise<string> {
  try {
    const userRecord = await admin.auth().getUser(adminUid);
    const customClaims = userRecord.customClaims || {};
    const userRole = customClaims.role as string | undefined;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new Error(
        `Unauthorized: User role '${userRole || 'none'}' is not in [${requiredRoles.join(', ')}]`
      );
    }

    return userRecord.email || 'unknown@neopay.com';
  } catch (error) {
    console.error('Role validation error:', error);
    throw new Error('Authorization failed');
  }
}
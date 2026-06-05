/**
 * Shared TypeScript types for NeoPay Cloud Functions
 * Ensures type safety across transaction operations and audit logging
 */

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'REJECTED' | 'FRAUD';

export type AuditAction = 'APPROVE' | 'REJECT' | 'FLAG_FRAUD' | 'REVEAL_PII';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  status: TransactionStatus;
  time: FirebaseFirestore.Timestamp;
  phone?: string;
  email?: string;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  txId: string;
  adminUid: string;
  adminEmail: string;
  action: AuditAction;
  timestamp: FirebaseFirestore.Timestamp;
  reason: string;
  previousState: TransactionStatus;
  newState?: TransactionStatus;
  ipAddress?: string;
  userAgent?: string;
}

export interface TransactionActionRequest {
  txId: string;
  reason: string;
}

export interface TransactionActionResponse {
  success: boolean;
  message: string;
  transaction?: Transaction;
  auditLog?: AuditLog;
}

export interface AdminClaims {
  role?: 'admin' | 'analyst' | 'manager';
  permissions?: string[];
}
/**
 * Transaction types for NeoPay Admin
 * These types mirror the backend types for type-safe communication
 */

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'REJECTED' | 'FRAUD';
export type AuditAction = 'APPROVE' | 'REJECT' | 'FLAG_FRAUD' | 'REVEAL_PII';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  status: TransactionStatus;
  time: { seconds: number; nanoseconds: number };
  phone?: string;
  email?: string;
  metadata?: Record<string, any>;
  approvedBy?: string;
  approvedAt?: { seconds: number; nanoseconds: number };
  approvalReason?: string;
  rejectedBy?: string;
  rejectedAt?: { seconds: number; nanoseconds: number };
  rejectionReason?: string;
  flaggedBy?: string;
  flaggedAt?: { seconds: number; nanoseconds: number };
  fraudReason?: string;
  fraudMetadata?: {
    userId: string;
    amount: number;
    flaggedTimestamp: { seconds: number; nanoseconds: number };
  };
}

export interface AuditLog {
  txId: string;
  adminUid: string;
  adminEmail: string;
  action: AuditAction;
  timestamp: { seconds: number; nanoseconds: number };
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
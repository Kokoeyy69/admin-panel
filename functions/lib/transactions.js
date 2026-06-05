"use strict";
/**
 * Transaction management Cloud Functions for NeoPay
 * SECURITY: All mutations are atomic and include audit logging
 * COMPLIANCE: RBAC enforced via custom claims
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectTransaction = exports.approveTransaction = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const audit_1 = require("./audit");
const db = admin.firestore();
/**
 * Approve a pending transaction
 * SECURITY: Requires 'admin' or 'manager' role
 * ATOMICITY: Uses Firestore transaction to ensure audit log is written
 */
exports.approveTransaction = (0, https_1.onCall)(async (request) => {
    // Authentication check
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to approve transactions');
    }
    const { txId, reason } = request.data;
    // Input validation
    if (!txId || !reason) {
        throw new https_1.HttpsError('invalid-argument', 'Transaction ID and reason are required');
    }
    if (reason.length < 10) {
        throw new https_1.HttpsError('invalid-argument', 'Reason must be at least 10 characters');
    }
    try {
        // RBAC validation
        const adminEmail = await (0, audit_1.validateAdminRole)(request.auth.uid, ['admin', 'manager']);
        // Atomic transaction
        const result = await db.runTransaction(async (transaction) => {
            var _a, _b;
            const txRef = db.collection('transactions').doc(txId);
            const txDoc = await transaction.get(txRef);
            if (!txDoc.exists) {
                throw new Error('Transaction not found');
            }
            const txData = txDoc.data();
            // Business rule validation
            if (txData.status !== 'PENDING') {
                throw new Error(`Transaction is in ${txData.status} state and cannot be approved`);
            }
            const previousState = txData.status;
            const newState = 'SUCCESS';
            // Update transaction status
            transaction.update(txRef, {
                status: newState,
                approvedBy: request.auth.uid,
                approvedAt: admin.firestore.FieldValue.serverTimestamp(),
                approvalReason: reason,
            });
            // Create audit log atomically
            (0, audit_1.createAuditLog)(transaction, txId, request.auth.uid, adminEmail, 'APPROVE', previousState, newState, reason, {
                ipAddress: (_a = request.rawRequest) === null || _a === void 0 ? void 0 : _a.ip,
                userAgent: (_b = request.rawRequest) === null || _b === void 0 ? void 0 : _b.headers['user-agent'],
            });
            return Object.assign(Object.assign({}, txData), { id: txId, status: newState });
        });
        return {
            success: true,
            message: 'Transaction approved successfully',
            transaction: result,
        };
    }
    catch (error) {
        console.error('Approve transaction error:', error);
        if (error.message.includes('not found')) {
            throw new https_1.HttpsError('not-found', error.message);
        }
        if (error.message.includes('Unauthorized')) {
            throw new https_1.HttpsError('permission-denied', error.message);
        }
        if (error.message.includes('cannot be approved')) {
            throw new https_1.HttpsError('failed-precondition', error.message);
        }
        throw new https_1.HttpsError('internal', 'Failed to approve transaction');
    }
});
/**
 * Reject a pending transaction
 * SECURITY: Requires 'admin' or 'analyst' role
 * ATOMICITY: Uses Firestore transaction to ensure audit log is written
 */
exports.rejectTransaction = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to reject transactions');
    }
    const { txId, reason } = request.data;
    if (!txId || !reason) {
        throw new https_1.HttpsError('invalid-argument', 'Transaction ID and reason are required');
    }
    if (reason.length < 10) {
        throw new https_1.HttpsError('invalid-argument', 'Reason must be at least 10 characters');
    }
    try {
        const adminEmail = await (0, audit_1.validateAdminRole)(request.auth.uid, ['admin', 'analyst', 'manager']);
        const result = await db.runTransaction(async (transaction) => {
            var _a, _b;
            const txRef = db.collection('transactions').doc(txId);
            const txDoc = await transaction.get(txRef);
            if (!txDoc.exists) {
                throw new Error('Transaction not found');
            }
            const txData = txDoc.data();
            if (txData.status !== 'PENDING') {
                throw new Error(`Transaction is in ${txData.status} state and cannot be rejected`);
            }
            const previousState = txData.status;
            const newState = 'REJECTED';
            transaction.update(txRef, {
                status: newState,
                rejectedBy: request.auth.uid,
                rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
                rejectionReason: reason,
            });
            (0, audit_1.createAuditLog)(transaction, txId, request.auth.uid, adminEmail, 'REJECT', previousState, newState, reason, {
                ipAddress: (_a = request.rawRequest) === null || _a === void 0 ? void 0 : _a.ip,
                userAgent: (_b = request.rawRequest) === null || _b === void 0 ? void 0 : _b.headers['user-agent'],
            });
            return Object.assign(Object.assign({}, txData), { id: txId, status: newState });
        });
        return {
            success: true,
            message: 'Transaction rejected successfully',
            transaction: result,
        };
    }
    catch (error) {
        console.error('Reject transaction error:', error);
        if (error.message.includes('not found')) {
            throw new https_1.HttpsError('not-found', error.message);
        }
        if (error.message.includes('Unauthorized')) {
            throw new https_1.HttpsError('permission-denied', error.message);
        }
        if (error.message.includes('cannot be rejected')) {
            throw new https_1.HttpsError('failed-precondition', error.message);
        }
        throw new https_1.HttpsError('internal', 'Failed to reject transaction');
    }
});
//# sourceMappingURL=transactions.js.map
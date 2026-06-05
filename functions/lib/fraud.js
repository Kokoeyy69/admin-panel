"use strict";
/**
 * Fraud detection and flagging functions for NeoPay
 * SECURITY: Requires admin role for fraud flagging
 * COMPLIANCE: All fraud flags are immutably logged
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
exports.flagTransactionFraud = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const audit_1 = require("./audit");
const db = admin.firestore();
/**
 * Flag a transaction as fraudulent
 * SECURITY: Requires 'admin' role only
 * ATOMICITY: Uses Firestore transaction to ensure audit log is written
 * CRITICAL: Fraud flags cannot be reversed without super-admin intervention
 */
exports.flagTransactionFraud = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to flag fraud');
    }
    const { txId, reason } = request.data;
    if (!txId || !reason) {
        throw new https_1.HttpsError('invalid-argument', 'Transaction ID and reason are required');
    }
    if (reason.length < 20) {
        throw new https_1.HttpsError('invalid-argument', 'Fraud flag reason must be at least 20 characters with specific details');
    }
    try {
        // Only admins can flag fraud
        const adminEmail = await (0, audit_1.validateAdminRole)(request.auth.uid, ['admin']);
        const result = await db.runTransaction(async (transaction) => {
            var _a, _b;
            const txRef = db.collection('transactions').doc(txId);
            const txDoc = await transaction.get(txRef);
            if (!txDoc.exists) {
                throw new Error('Transaction not found');
            }
            const txData = txDoc.data();
            const previousState = txData.status;
            const newState = 'FRAUD';
            // Update transaction to FRAUD status
            transaction.update(txRef, {
                status: newState,
                flaggedBy: request.auth.uid,
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
            (0, audit_1.createAuditLog)(transaction, txId, request.auth.uid, adminEmail, 'FLAG_FRAUD', previousState, newState, reason, {
                ipAddress: (_a = request.rawRequest) === null || _a === void 0 ? void 0 : _a.ip,
                userAgent: (_b = request.rawRequest) === null || _b === void 0 ? void 0 : _b.headers['user-agent'],
            });
            // Also flag the user for review
            const userRef = db.collection('users').doc(txData.userId);
            transaction.update(userRef, {
                fraudFlagCount: admin.firestore.FieldValue.increment(1),
                lastFraudFlag: admin.firestore.FieldValue.serverTimestamp(),
                requiresReview: true,
            });
            return Object.assign(Object.assign({}, txData), { id: txId, status: newState });
        });
        return {
            success: true,
            message: 'Transaction flagged as fraud successfully',
            transaction: result,
        };
    }
    catch (error) {
        console.error('Flag fraud error:', error);
        if (error.message.includes('not found')) {
            throw new https_1.HttpsError('not-found', error.message);
        }
        if (error.message.includes('Unauthorized')) {
            throw new https_1.HttpsError('permission-denied', error.message);
        }
        throw new https_1.HttpsError('internal', 'Failed to flag transaction as fraud');
    }
});
//# sourceMappingURL=fraud.js.map
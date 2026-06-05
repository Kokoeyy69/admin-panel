/**
 * NeoPay Cloud Functions Entry Point
 * Exports all callable functions for transaction management
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export transaction management functions
export { approveTransaction, rejectTransaction } from './transactions';
export { flagTransactionFraud } from './fraud';
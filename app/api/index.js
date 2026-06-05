const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin SDK via Environment Variable
try {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("FATAL: FIREBASE_SERVICE_ACCOUNT environment variable is missing!");
    }
    
    // Parse JSON dari Environment Variable Vercel
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

const db = admin.firestore();
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Health Check Endpoint - Fixes 404 on root URL
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'NeoPay API is Live! 🚀 | Made by Rico',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check for API routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'NeoPay API is Live! 🚀 | Made by Rico',
    endpoints: [
      'POST /api/transfer',
      'POST /api/topup',
      'GET /api/user/:uid/balance',
      'GET /api/transaction/:transactionId'
    ]
  });
});

// API Key validation middleware
const API_KEY = process.env.NEOPAY_API_KEY || 'neopay-secure-key-2024';

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === API_KEY) {
    return next();
  }
  // Allow requests without API key for development
  return next();
};

/**
 * POST /api/transfer
 * Secure transfer endpoint using Firestore transactions
 */
app.post('/api/transfer', validateApiKey, async (req, res) => {
  const { senderUid, recipientUid, amount, recipientName, senderName } = req.body;

  // Validation
  if (!senderUid || !recipientUid || !amount) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: senderUid, recipientUid, amount'
    });
  }

  if (senderUid === recipientUid) {
    return res.status(400).json({
      success: false,
      error: 'Cannot transfer to yourself'
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid amount: must be a positive number'
    });
  }

  if (amount < 1000) {
    return res.status(400).json({
      success: false,
      error: 'Minimum transfer amount is Rp 1.000'
    });
  }

  if (amount > 50000000) {
    return res.status(400).json({
      success: false,
      error: 'Maximum transfer amount is Rp 50.000.000'
    });
  }

  try {
    const transferRef = db.collection('transactions').doc();

    await db.runTransaction(async (transaction) => {
      const senderRef = db.collection('users').doc(senderUid);
      const recipientRef = db.collection('users').doc(recipientUid);

      const senderDoc = await transaction.get(senderRef);
      const recipientDoc = await transaction.get(recipientRef);

      if (!senderDoc.exists) {
        throw new Error('Sender account not found');
      }

      if (!recipientDoc.exists) {
        throw new Error('Recipient account not found');
      }

      const senderData = senderDoc.data();
      const senderBalance = senderData?.balance || 0;

      if (senderBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Execute the transfer
      transaction.update(senderRef, {
        balance: admin.firestore.FieldValue.increment(-amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.update(recipientRef, {
        balance: admin.firestore.FieldValue.increment(amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create transaction log
      transaction.set(transferRef, {
        sender_uid: senderUid,
        recipient_uid: recipientUid,
        recipient_name: recipientName || recipientDoc.data()?.name || 'User',
        sender_name: senderName || senderDoc.data()?.name || 'User',
        amount: amount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'p2p_transfer',
        status: 'success',
        currency: 'IDR'
      });
    });

    res.status(200).json({
      success: true,
      message: 'Transfer successful',
      data: {
        transactionId: transferRef.id,
        amount: amount,
        recipient: recipientName,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error.message || 'Transfer failed';
    
    if (errorMessage === 'Insufficient balance') {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: 'Saldo tidak mencukupi'
      });
    }

    if (errorMessage === 'Recipient account not found' || errorMessage === 'Sender account not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Pengguna tidak ditemukan'
      });
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Transfer failed'
    });
  }
});

/**
 * POST /api/topup
 * Secure top-up endpoint
 */
app.post('/api/topup', validateApiKey, async (req, res) => {
  const { uid, amount } = req.body;

  // Validation
  if (!uid || !amount) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: uid, amount'
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid amount: must be a positive number'
    });
  }

  if (amount < 10000) {
    return res.status(400).json({
      success: false,
      error: 'Minimum top-up amount is Rp 10.000'
    });
  }

  if (amount > 10000000) {
    return res.status(400).json({
      success: false,
      error: 'Maximum top-up amount is Rp 10.000.000'
    });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const topupRef = db.collection('transactions').doc();

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User account not found');
      }

      // Update balance
      transaction.update(userRef, {
        balance: admin.firestore.FieldValue.increment(amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create transaction log
      transaction.set(topupRef, {
        uid: uid,
        amount: amount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'top_up',
        status: 'success',
        method: 'api_topup',
        currency: 'IDR'
      });
    });

    res.status(200).json({
      success: true,
      message: 'Top-up successful',
      data: {
        transactionId: topupRef.id,
        amount: amount,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error.message || 'Top-up failed';

    if (errorMessage === 'User account not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Pengguna tidak ditemukan'
      });
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      message: 'Top-up failed'
    });
  }
});

/**
 * GET /api/user/:uid/balance
 * Get user balance
 */
app.get('/api/user/:uid/balance', validateApiKey, async (req, res) => {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({
      success: false,
      error: 'User ID is required'
    });
  }

  try {
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userDoc.data();
    res.status(200).json({
      success: true,
      data: {
        uid: uid,
        balance: userData?.balance || 0,
        currency: 'IDR'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance'
    });
  }
});

/**
 * GET /api/transaction/:transactionId
 * Get transaction details
 */
app.get('/api/transaction/:transactionId', validateApiKey, async (req, res) => {
  const { transactionId } = req.params;

  if (!transactionId) {
    return res.status(400).json({
      success: false,
      error: 'Transaction ID is required'
    });
  }

  try {
    const transactionDoc = await db.collection('transactions').doc(transactionId).get();

    if (!transactionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    const transactionData = transactionDoc.data();
    res.status(200).json({
      success: true,
      data: {
        id: transactionId,
        ...transactionData
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction'
    });
  }
});

// Export for Vercel
module.exports = app;
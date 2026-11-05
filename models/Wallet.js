const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    orderCode: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['compensation', 'fee', 'withdrawal'], default: 'compensation' },
    title: { type: String, required: true },
    note: String,
    channel: { type: String, default: 'Shopee' },
  },
  { _id: true }
);

const walletSchema = new mongoose.Schema(
  {
    shopCode: { type: String, default: 'MINH-AN-SHOP', unique: true },
    shopName: { type: String, default: 'Shop Minh An' },
    balance: { type: Number, default: 15420000 },
    totalCompensated: { type: Number, default: 420000 },
    transactions: [transactionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Wallet || mongoose.model('Wallet', walletSchema);


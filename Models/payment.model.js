const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    tenant_id: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    payment_id: {
      type: String,
      required: true,
      unique: true,
    },
    paypal_order_id: {
      type: String,
      required: true,
    },
    paypal_payer_id: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
    plan: {
      type: String,
      enum: ['small', 'medium', 'large'],
      required: true,
    },
    billing_cycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    payment_method: {
      type: String,
      default: 'paypal',
    },
    payment_date: {
      type: Date,
    },
    subscription_start_date: {
      type: Date,
    },
    subscription_end_date: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Index for faster queries
paymentSchema.index({ tenant_id: 1 });
paymentSchema.index({ payment_id: 1 });
paymentSchema.index({ paypal_order_id: 1 });

module.exports = mongoose.model("Payment", paymentSchema);

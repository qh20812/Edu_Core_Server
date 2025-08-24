const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tenantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    school_code: { 
      type: String, 
      required: false, 
      trim: true, 
      unique: true, 
      sparse: true // Allows null/undefined values but ensures uniqueness when present
    },
    school_type: {
      type: String,
      enum: ['elementary', 'middle_school', 'high_school', 'university', 'vocational', 'other'],
      default: 'high_school'
    },
    address: { type: String, required: false },
    city: { type: String, required: false, trim: true },
    province: { type: String, required: false, trim: true },
    postal_code: { type: String, required: false, trim: true },
    contact_email: {
      type: String,
      required: false,
      trim: true,
      maxlength: 255,
    },
    contact_phone: { type: String, required: false, trim: true, maxlength: 20 },
    website: { type: String, required: false, trim: true },
    established_year: { type: Number, required: false },
    total_students: { type: Number, required: false, default: 0 },
    total_teachers: { type: Number, required: false, default: 0 },
    description: { type: String, required: false, trim: true },
    is_active: { type: Boolean, default: true },
    
    // Approval Status - For system admin approval workflow
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'suspended'], 
      default: 'pending' 
    },
    approved_at: { type: Date },
    rejected_at: { type: Date },
    rejection_reason: { type: String },
    
    // Subscription and Plan Information
    plan: { 
      type: String, 
      enum: ['small', 'medium', 'large'], 
      default: 'small' 
    },
    subscription_status: { 
      type: String, 
      enum: ['trial', 'active', 'inactive', 'expired', 'pending'], 
      default: 'trial' 
    },
    billing_cycle: { 
      type: String, 
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    subscription_start_date: { type: Date },
    subscription_end_date: { type: Date },
    max_students: { type: Number, default: 300 },
    
    // Payment Information
    last_payment_date: { type: Date },
    last_payment_amount: { type: Number },
    payment_method: { type: String },
    paypal_subscription_id: { type: String },
    
    // Trial Information
    trial_start_date: { type: Date, default: Date.now },
    trial_end_date: { 
      type: Date, 
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("Tenant", tenantSchema);

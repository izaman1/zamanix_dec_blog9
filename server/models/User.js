import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  coins: {
    type: Number,
    default: 10 // Initial signup bonus
  },
  lastLoginDate: {
    type: Date,
    default: null
  },
  loginStreak: {
    type: Number,
    default: 0
  },
  events: [{
    date: Date,
    occasion: String,
    name: String,
    notes: String,
    recurrence: {
      type: String,
      enum: ['once', 'weekly', 'monthly', 'yearly'],
      default: 'once'
    }
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to handle daily login rewards
userSchema.methods.handleDailyLogin = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.lastLoginDate) {
    // First time login
    this.loginStreak = 1;
    this.coins += 1; // Base daily login reward
  } else {
    const lastLogin = new Date(this.lastLoginDate);
    lastLogin.setHours(0, 0, 0, 0);
    const daysDifference = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

    if (daysDifference === 1) {
      // Consecutive day login
      this.loginStreak += 1;
      // Base coin (1) + streak bonus (up to 2)
      this.coins += 1 + Math.min(this.loginStreak - 1, 2);
    } else if (daysDifference > 1) {
      // Streak broken
      this.loginStreak = 1;
      this.coins += 1; // Base daily login reward
    }
  }

  this.lastLoginDate = today;
  return this.save();
};

export default mongoose.model('User', userSchema);
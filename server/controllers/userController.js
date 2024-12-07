import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const user = await User.create({
      name,
      email,
      password,
      phone,
      coins: 5, // Minimum starting coins
      lastLoginDate: new Date(),
      loginStreak: 1
    });

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully! You received 5 coins as a signup bonus.',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        coins: user.coins,
        loginStreak: user.loginStreak,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    if (error.code === 11000) { // MongoDB duplicate key error
      res.status(400);
      throw new Error('Email already registered');
    }
    throw error;
  }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Special case for admin
  if (email === 'admin@zamanix.com' && password === 'zamanix_admin') {
    return res.json({
      status: 'success',
      message: 'Admin login successful',
      data: {
        _id: 'admin',
        name: 'Admin',
        email: 'admin@zamanix.com',
        coins: 0,
        loginStreak: 0,
        token: generateToken('admin')
      }
    });
  }

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    // Handle daily login rewards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let coinsEarned = 1; // Base daily reward
    let message = 'Welcome back! You earned 1 coin.';

    if (user.lastLoginDate) {
      const lastLogin = new Date(user.lastLoginDate);
      lastLogin.setHours(0, 0, 0, 0);
      const daysDifference = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

      if (daysDifference === 1) {
        // Consecutive day login
        user.loginStreak += 1;
        const streakBonus = Math.min(user.loginStreak - 1, 2);
        coinsEarned += streakBonus;
        message = `Welcome back! ${user.loginStreak} day streak! You earned ${coinsEarned} coins.`;
      } else if (daysDifference > 1) {
        // Streak broken
        user.loginStreak = 1;
        message = 'Welcome back! You earned 1 coin.';
      }
    }

    // Ensure minimum 5 coins
    user.coins = Math.max(5, user.coins + coinsEarned);
    user.lastLoginDate = today;
    await user.save();

    res.json({
      status: 'success',
      message,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        coins: user.coins,
        loginStreak: user.loginStreak,
        token: generateToken(user._id)
      }
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      status: 'success',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        coins: Math.max(5, user.coins), // Ensure minimum 5 coins
        loginStreak: user.loginStreak,
        events: user.events
      }
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      status: 'success',
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        coins: Math.max(5, updatedUser.coins), // Ensure minimum 5 coins
        loginStreak: updatedUser.loginStreak,
        token: generateToken(updatedUser._id)
      }
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});
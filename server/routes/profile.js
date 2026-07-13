const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/profile (Fetch user data)
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// PUT /api/profile (Update user data)
router.put('/', auth, async (req, res) => {
  try {
    // Find the user and update their document with the incoming form data
    const updatedUser = await User.findByIdAndUpdate(
      req.userId, 
      { $set: req.body }, 
      { new: true } // Returns the updated document
    ).select('-password');
    
    res.json(updatedUser);
  } catch (err) {
    // ---> WE ADDED THIS LINE BELOW TO CATCH THE BUG <---
    console.error("PROFILE SAVE ERROR:", err); 
    res.status(500).send('Server Error');
  }
});

module.exports = router;
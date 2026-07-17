const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const JobApplication = require('../models/JobApplication');

// List all saved jobs for the logged-in user (for SavedJobs.jsx)
router.get('/', auth, async (req, res) => {
  try {
    const jobs = await JobApplication.find({ userId: req.userId })
      .select('companyName jobDescription template createdAt pdfUrl')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch one job by its real DB id (what ResultDashboard.jsx should load from)
router.get('/:id', auth, async (req, res) => {
  // Guard against non-ObjectId values (e.g. a stale "/dashboard/latest" link)
  // -- without this, Mongoose throws a CastError that looks like a server
  // crash instead of a simple "not found".
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid job ID.' });
  }
  try {
    const job = await JobApplication.findOne({ _id: req.params.id, userId: req.userId });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid job ID.' });
  }
  try {
    await JobApplication.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
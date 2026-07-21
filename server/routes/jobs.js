const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();
const auth = require('../middleware/auth');
const JobApplication = require('../models/JobApplication');
const { injectTemplate } = require('../utils/buildLatex');
const { compileLatex } = require('../utils/compileLatex');

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

router.get('/:id', auth, async (req, res) => {
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

// ---------------------------------------------------------------------
// PATCH /api/jobs/:id/sections/:sectionId/toggle
// Flips a single section's `visible` flag and recompiles the PDF
// immediately. No AI call -- this is a direct, instant, deterministic
// action so the on/off switch feels snappy in the UI.
// ---------------------------------------------------------------------
router.patch('/:id/sections/:sectionId/toggle', auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid job ID.' });
  }
  try {
    const job = await JobApplication.findOne({ _id: req.params.id, userId: req.userId });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const section = job.sections.find((s) => s.id === req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    section.visible = !section.visible;
    job.markModified('sections');

    const templatePath = path.join(__dirname, `../templates/${job.template}.tex`);
    const rawLatexTemplate = await fs.readFile(templatePath, 'utf8');
    const finalLatex = injectTemplate(rawLatexTemplate, job.personal || {}, job.sections, job.omitFields || [], job.template);
    const { pdfFileName } = await compileLatex(finalLatex);
    job.pdfUrl = `https://jword-resume-builder.onrender.com/pdfs/${pdfFileName}`;

    await job.save();
    res.json({ success: true, data: job.toObject() });
  } catch (err) {
    console.error('Section toggle error:', err);
    res.status(500).json({ message: 'Failed to toggle section visibility.' });
  }
});


// PATCH /api/jobs/:id/sections/:sectionId/content
// Overwrites a single section's editable content and recompiles the PDF.
router.patch('/:id/sections/:sectionId/content', auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid job ID.' });
  }
  try {
    const job = await JobApplication.findOne({ _id: req.params.id, userId: req.userId });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const section = job.sections.find((s) => s.id === req.params.sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    section.content = req.body.content || {};
    job.markModified('sections');

    const templatePath = path.join(__dirname, `../templates/${job.template}.tex`);
    const rawLatexTemplate = await fs.readFile(templatePath, 'utf8');
    const finalLatex = injectTemplate(rawLatexTemplate, job.personal || {}, job.sections, job.omitFields || [], job.template);
    const { pdfFileName } = await compileLatex(finalLatex);
    job.pdfUrl = `https://jword-resume-builder.onrender.com/pdfs/${pdfFileName}`;

    await job.save();
    res.json({ success: true, data: job.toObject() });
  } catch (err) {
    console.error('Section content save error:', err);
    res.status(500).json({ message: 'Failed to save section changes.' });
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
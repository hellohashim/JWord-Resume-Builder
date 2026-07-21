const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  id: { type: String, required: true },       // stable key: 'summary', 'skills', or a slug for custom sections
  type: {
    type: String,
    enum: ['summary', 'skills', 'experience', 'projects', 'education', 'certifications', 'languages', 'custom'],
    required: true,
  },
  title: { type: String, required: true },     // user-editable display title
  visible: { type: Boolean, default: true },   // false = hidden from PDF, data stays in DB
  order: { type: Number, required: true },
  content: { type: mongoose.Schema.Types.Mixed, default: {} }, // shape depends on type
}, { _id: false });

const JobApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, default: '' },
  jobDescription: { type: String, required: true },
  template: { type: String, default: 'classic' },
  personal: { type: Object, default: {} },
  sections: { type: [SectionSchema], default: [] },
  gapAnalysis: { type: Object, default: {} },
  omitFields: [{ type: String }], // still used for personal.linkedin / personal.github only now
  pdfUrl: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('JobApplication', JobApplicationSchema);
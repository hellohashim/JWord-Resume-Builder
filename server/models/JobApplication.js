const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, default: '' },
  jobDescription: { type: String, required: true },
  template: { type: String, default: 'classic' },
  personal: { type: Object, default: {} },
  tailoredProfile: { type: Object, default: {} },
  gapAnalysis: { type: Object, default: {} },
  omitFields: [{ type: String }],
  pdfUrl: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('JobApplication', JobApplicationSchema);
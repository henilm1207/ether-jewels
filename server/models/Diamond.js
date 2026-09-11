const mongoose = require('mongoose');

/**
 * Diamond inventory — STUB for v2 only.
 * Matches Diamond.jsx filter panel: shape, carat 1-30, color D-K + WHITE/FANCY,
 * clarity, cut, polish, symmetry, fluorescence, cert GIA/IGI/WISE, table%, ratio.
 * Not seeded or routed in v1. Adding search route later needs no schema change.
 */
const diamondSchema = new mongoose.Schema(
  {
    stockId: { type: String, unique: true, sparse: true },
    shape: String,
    carat: { type: Number, min: 0 },
    price: { type: Number, min: 0 },
    currency: { type: String, enum: ['USD'], default: 'USD' },
    color: String,
    fancyType: { type: String, enum: ['WHITE', 'FANCY'], default: 'WHITE' },
    clarity: String,
    cut: String,
    polish: String,
    symmetry: String,
    fluorescence: String,
    tablePct: Number,
    ratio: Number,
    depthPct: Number,
    measurements: String,
    lab: { type: String, enum: ['GIA', 'IGI', 'WISE', 'SHC'] },
    certNumber: { type: String, unique: true, sparse: true },
    origin: { type: String, enum: ['lab', 'natural'], default: 'lab' },
    available: { type: Boolean, default: true },
    image: String,
    video: String,
    certUrl: String,
  },
  { timestamps: true }
);

diamondSchema.index({ shape: 1, carat: 1, price: 1 });
diamondSchema.index({ color: 1, clarity: 1, cut: 1 });

module.exports = mongoose.model('Diamond', diamondSchema);

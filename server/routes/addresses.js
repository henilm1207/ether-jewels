// Saved addresses — /api/account/addresses (auth). Always editable, even
// with open orders: each order holds its own frozen shippingAddress copy.
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');
const { normalizeAddress, addressKey, MAX_SAVED } = require('../lib/address');

const router = express.Router();
const LABELS = ['home', 'work', 'other'];

async function loadUser(req) {
  return User.findById(req.user._id).select('addresses');
}

function validate(body, res) {
  const { ok, value, errors } = normalizeAddress(body);
  if (!ok) {
    res.status(400).json({ message: 'Please fix the highlighted fields', fields: errors });
    return null;
  }
  value.label = LABELS.includes(body && body.label) ? body.label : 'home';
  return value;
}

function setDefault(user, id) {
  for (const a of user.addresses) a.isDefault = String(a._id) === String(id);
}

// Ensures exactly one default whenever any address exists.
function ensureDefault(user) {
  if (user.addresses.length && !user.addresses.some((a) => a.isDefault)) user.addresses[0].isDefault = true;
}

router.get('/', authRequired, async (req, res, next) => {
  try {
    const user = await loadUser(req);
    res.json(user ? user.addresses : []);
  } catch (e) {
    next(e);
  }
});

router.post('/', authRequired, async (req, res, next) => {
  try {
    const value = validate(req.body, res);
    if (!value) return;
    const user = await loadUser(req);
    if (user.addresses.length >= MAX_SAVED)
      return res.status(400).json({ message: `You can save up to ${MAX_SAVED} addresses` });
    if (user.addresses.some((a) => addressKey(a) === addressKey(value)))
      return res.status(400).json({ message: 'This address is already saved' });
    user.addresses.push(value);
    const added = user.addresses[user.addresses.length - 1];
    if (req.body.isDefault === true || user.addresses.length === 1) setDefault(user, added._id);
    await user.save();
    res.status(201).json(user.addresses);
  } catch (e) {
    next(e);
  }
});

router.put('/:id', authRequired, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Address not found' });
    const value = validate(req.body, res);
    if (!value) return;
    const user = await loadUser(req);
    const addr = user.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });
    // Clear optional fields the customer emptied, then apply the new values.
    for (const k of ['line2', 'landmark', 'area', 'phone', 'state', 'zip']) addr[k] = undefined;
    addr.set(value);
    if (req.body.isDefault === true) setDefault(user, addr._id);
    await user.save();
    res.json(user.addresses);
  } catch (e) {
    next(e);
  }
});

router.patch('/:id/default', authRequired, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Address not found' });
    const user = await loadUser(req);
    if (!user.addresses.id(req.params.id)) return res.status(404).json({ message: 'Address not found' });
    setDefault(user, req.params.id);
    await user.save();
    res.json(user.addresses);
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Address not found' });
    const user = await loadUser(req);
    const addr = user.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });
    addr.deleteOne();
    ensureDefault(user);
    await user.save();
    res.json(user.addresses);
  } catch (e) {
    next(e);
  }
});

module.exports = router;

const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI missing — copy .env.example to .env and set it');
  }
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    // Force IPv4: Atlas access lists can't contain IPv6, and dual-stack
    // machines otherwise egress over v6 and get rejected at the firewall.
    family: 4,
  });
  console.log(`MongoDB connected: ${conn.connection.host}`);
  mongoose.connection.on('error', (e) => console.error('MongoDB error:', e.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  return conn;
};

module.exports = connectDB;

/**
 * Utility script to fix COD orders that are delivered but still have pending payment status
 * Run this once to fix existing data
 */

import mongoose from 'mongoose';
import Order from './src/models/orderSchema.model.js';

// Connect to MongoDB (update connection string as needed)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixCODPayments = async () => {
  try {
    // Find all COD orders that are delivered but payment status is still pending
    const ordersToFix = await Order.find({
      'payment.method': 'cod',
      'payment.status': 'pending',
      'orderStatus': 'delivered'
    });

    console.log(`Found ${ordersToFix.length} COD orders to fix`);

    if (ordersToFix.length === 0) {
      console.log('No orders need fixing');
      return;
    }

    // Update all these orders to mark payment as paid
    const result = await Order.updateMany(
      {
        'payment.method': 'cod',
        'payment.status': 'pending',
        'orderStatus': 'delivered'
      },
      {
        $set: {
          'payment.status': 'paid',
          'payment.paidAt': new Date()
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} orders`);
    
    // Log the order numbers that were updated
    const updatedOrders = await Order.find({
      'payment.method': 'cod',
      'payment.status': 'paid',
      'orderStatus': 'delivered',
      'payment.paidAt': { $exists: true }
    }).select('orderNumber payment.paidAt').sort({ 'payment.paidAt': -1 }).limit(result.modifiedCount);

    console.log('Updated orders:');
    updatedOrders.forEach(order => {
      console.log(`- ${order.orderNumber} (paid at: ${order.payment.paidAt})`);
    });

  } catch (error) {
    console.error('Error fixing COD payments:', error);
  }
};

const main = async () => {
  await connectDB();
  await fixCODPayments();
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
};

// Run the script
main().catch(console.error);
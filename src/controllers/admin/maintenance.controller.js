import Order from "../../models/orderSchema.model.js";

export const fixCODPayments = async (req, res, next) => {
  try {
    // Find all COD orders that are delivered but payment status is still pending
    const ordersToFix = await Order.find({
      'payment.method': 'cod',
      'payment.status': 'pending',
      'orderStatus': 'delivered'
    }).select('orderNumber createdAt');

    if (ordersToFix.length === 0) {
      return res.json({
        success: true,
        message: 'No COD orders need fixing',
        fixed: 0,
        orders: []
      });
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

    return res.json({
      success: true,
      message: `Fixed ${result.modifiedCount} COD orders`,
      fixed: result.modifiedCount,
      orders: ordersToFix.map(order => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fixing COD payments:', error);
    next(error);
  }
};

export const getMaintenancePage = async (req, res, next) => {
  try {
    // Get count of COD orders that need fixing
    const codOrdersNeedingFix = await Order.countDocuments({
      'payment.method': 'cod',
      'payment.status': 'pending',
      'orderStatus': 'delivered'
    });

    return res.render('admin/maintenance/index', {
      title: 'Maintenance',
      codOrdersNeedingFix
    });
  } catch (error) {
    console.error('Error loading maintenance page:', error);
    next(error);
  }
};
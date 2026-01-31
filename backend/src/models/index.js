// Export all models from a central location
const Order = require('./Order');
const Customer = require('./Customer');
const Product = require('./Product');
const User = require('./User');
const Tenant = require('./Tenant');
const DeliveryProvider = require('./DeliveryProvider');
const Communication = require('./Communication');
const AutomationRule = require('./AutomationRule');

module.exports = {
  Order,
  Customer,
  Product,
  User,
  Tenant,
  DeliveryProvider,
  Communication,
  AutomationRule
};
// import axios from 'axios';

// // Use relative URL for API calls, which will work with nginx proxy in production
// // and direct connection in development
// const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8080/api';

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // Merchants API
// export const merchantsAPI = {
//   getAll: () => api.get('/merchants'),
//   getById: (id) => api.get(`/merchants/${id}`),
//   create: (merchant) => api.post('/merchants', merchant),
//   update: (id, merchant) => api.put(`/merchants/${id}`, merchant),
//   delete: (id) => api.delete(`/merchants/${id}`),
// };

// // Products API
// export const productsAPI = {
//   getAll: () => api.get('/products'),
//   getById: (id) => api.get(`/products/${id}`),
//   getByMerchant: (merchantId) => api.get(`/products/merchant/${merchantId}`),
//   search: (name) => api.get(`/products/search?name=${name}`),
//   create: (product) => api.post('/products', product),
//   update: (id, product) => api.put(`/products/${id}`, product),
//   delete: (id) => api.delete(`/products/${id}`),
// };

// // Orders API
// export const ordersAPI = {
//   getAll: () => api.get('/orders'),
//   getById: (id) => api.get(`/orders/${id}`),
//   getByStatus: (status) => api.get(`/orders/status/${status}`),
//   getByProduct: (productId) => api.get(`/orders/product/${productId}`),
//   create: (order) => api.post('/orders', order),
//   placeOrder: (order) => api.post('/orders/place', order),
//   update: (id, order) => api.put(`/orders/${id}`, order),
//   delete: (id) => api.delete(`/orders/${id}`),
//   assignAgent: (orderId, agentId) => api.post(`/orders/${orderId}/assign-agent/${agentId}`),
//   markPickedUp: (orderId) => api.post(`/orders/${orderId}/pickup`),
//   markOutForDelivery: (orderId) => api.post(`/orders/${orderId}/out-for-delivery`),
//   deliver: (orderId, otp) => api.post(`/orders/${orderId}/deliver`, { otp }),
//   cancel: (orderId) => api.post(`/orders/${orderId}/cancel`),
//   // Customer-specific endpoints
//   getCustomerHistory: (customerId) => api.get(`/orders/customer/${customerId}/history`),
//   getCustomerOrders: (customerId, status = null) => api.get(`/orders/customer/${customerId}/orders${status ? `?status=${status}` : ''}`),
// };

// // Customers API
// export const customersAPI = {
//   getAll: () => api.get('/customers'),
//   getById: (id) => api.get(`/customers/${id}`),
//   search: (name) => api.get(`/customers/search?name=${name}`),
//   getByEmail: (email) => api.get(`/customers/email/${email}`),
//   getByPhone: (phone) => api.get(`/customers/phone/${phone}`),
//   create: (customer) => api.post('/customers', customer),
//   update: (id, customer) => api.put(`/customers/${id}`, customer),
//   delete: (id) => api.delete(`/customers/${id}`),
// };

// // Delivery Agents API
// export const agentsAPI = {
//   getAll: () => api.get('/agents'),
//   getById: (id) => api.get(`/agents/${id}`),
//   getByStatus: (status) => api.get(`/agents/status/${status}`),
//   getAvailable: () => api.get('/agents/available'),
//   create: (agent) => api.post('/agents', agent),
//   update: (id, agent) => api.put(`/agents/${id}`, agent),
//   delete: (id) => api.delete(`/agents/${id}`),
// };

// export default api;

import axios from 'axios';

// ✅ Use relative URL for production (works with nginx proxy) and localhost for dev
const API_BASE_URL =
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

//
// 🧩 Merchants API
//
export const merchantsAPI = {
  getAll: () => api.get('/merchants'),
  getById: (id) => api.get(`/merchants/${id}`),
  create: (merchant) => api.post('/merchants', merchant),
  update: (id, merchant) => api.put(`/merchants/${id}`, merchant),
  delete: (id) => api.delete(`/merchants/${id}`),
};

//
// 🛍️ Products API
//
export const productsAPI = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  getByMerchant: (merchantId) => api.get(`/products/merchant/${merchantId}`),
  search: (name) => api.get(`/products/search?name=${name}`),
  create: (product) => api.post('/products', product),
  update: (id, product) => api.put(`/products/${id}`, product),
  delete: (id) => api.delete(`/products/${id}`),
};

//
// 📦 Orders API
//
export const ordersAPI = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  getByStatus: (status) => api.get(`/orders/status/${status}`),
  getByProduct: (productId) => api.get(`/orders/product/${productId}`),
  markDelivered: (id) => api.put(`/orders/${id}/delivered`),
  create: (order) => api.post('/orders', order),
  placeOrder: (order) => api.post('/orders/place', order),
  update: (id, order) => api.put(`/orders/${id}`, order),
  delete: (id) => api.delete(`/orders/${id}`),
  assignAgent: (orderId, agentId) =>
    api.post(`/orders/${orderId}/assign-agent/${agentId}`),
  markPickedUp: (orderId) => api.put(`/orders/${orderId}/pickup`),
  markOutForDelivery: (orderId) =>
    api.post(`/orders/${orderId}/out-for-delivery`),
  deliver: (orderId, otp) => api.post(`/orders/${orderId}/deliver`, { otp }),
  cancel: (orderId) => api.post(`/orders/${orderId}/cancel`),
  //markPickedUp: (orderId) => axios.put(`/api/orders/${orderId}/pickup`),

  // 🧾 Customer-specific endpoints
  getCustomerHistory: (customerId) =>
    api.get(`/orders/customer/${customerId}/history`),
  getCustomerOrders: (customerId, status = null) =>
    api.get(
      `/orders/customer/${customerId}/orders${status ? `?status=${status}` : ''
      }`
    ),
};

//
// 👥 Customers API
//
export const customersAPI = {
  getAll: () => api.get('/customers'),
  getById: (id) => api.get(`/customers/${id}`),
  search: (name) => api.get(`/customers/search?name=${name}`),
  getByEmail: (email) => api.get(`/customers/email/${email}`),
  getByPhone: (phone) => api.get(`/customers/phone/${phone}`),
  create: (customer) => api.post('/customers', customer),
  update: (id, customer) => api.put(`/customers/${id}`, customer),
  delete: (id) => api.delete(`/customers/${id}`),
};

//
// 🚚 Delivery Agents API
//
export const agentsAPI = {
  getAll: () => api.get('/agents'),
  getById: (id) => api.get(`/agents/${id}`),
  getByStatus: (status) => api.get(`/agents/status/${status}`),
  getAvailable: () => api.get('/agents/available'),
  create: (agent) => api.post('/agents', agent),
  update: (id, agent) => api.put(`/agents/${id}`, agent),
  delete: (id) => api.delete(`/agents/${id}`),
};

//
// 🏬 Warehouses API  ✅ (NEW)
//
export const warehousesAPI = {
  getAll: () => api.get('/warehouses'),
  getById: (id) => api.get(`/warehouses/${id}`),
  create: (warehouse) => api.post('/warehouses', warehouse),
  update: (id, warehouse) => api.put(`/warehouses/${id}`, warehouse),
  delete: (id) => api.delete(`/warehouses/${id}`),
};

export default api;

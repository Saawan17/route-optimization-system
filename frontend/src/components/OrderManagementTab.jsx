import '../polyfills';  // Must be first import

import React, { useState, useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ordersAPI,
  customersAPI,
  productsAPI,
  warehousesAPI,
  agentsAPI,
} from "../services/api";

window.global = window;

const OrderManagementTab = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [agents, setAgents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerId: "",
    productId: "",
    quantity: 1,
    address: "",
  });
  const stompRef = useRef(null);

  // 🔄 Fetch all data
  useEffect(() => {
    fetchAllData();
    connectWebSocket();
    return () => {
      try {
        if (stompRef.current) stompRef.current.disconnect();
      } catch (_) { }
    };
  }, []);

  const fetchAllData = async () => {
    try {
      const [ordersRes, customersRes, productsRes, warehousesRes, agentsRes] =
        await Promise.all([
          ordersAPI.getAll(),
          customersAPI.getAll(),
          productsAPI.getAll(),
          warehousesAPI.getAll(),
          agentsAPI.getAll(),
        ]);
      setOrders(ordersRes.data || []);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      setWarehouses(warehousesRes.data || []);
      setAgents(agentsRes.data || []);
    } catch (err) {
      console.error("❌ Fetch failed", err);
    }
  };

  const connectWebSocket = () => {
    try {
      const socket = new SockJS(`${window.location.protocol}//${window.location.hostname}:8080/ws`);
      const stompClient = Stomp.over(socket);
      stompClient.debug = () => { };
      stompClient.connect({}, () => {
        stompClient.subscribe("/topic/driver-updates", (msg) => {
          if (!msg.body) return;
          const data = JSON.parse(msg.body);
          setDrivers(Array.isArray(data) ? data : [data]);
        });
      });
      stompRef.current = stompClient;
    } catch (err) {
      console.error("WebSocket failed", err);
    }
  };

  const findNearestWarehouse = (customer, warehouses) => {
    if (!customer || !warehouses?.length) return null;
    const { latitude, longitude } = customer;
    let nearest = null;
    let minDistance = Infinity;

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    warehouses.forEach((wh) => {
      if (wh.latitude && wh.longitude) {
        const dist = calculateDistance(latitude, longitude, wh.latitude, wh.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = wh;
        }
      }
    });
    return nearest;
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const customer = customers.find((c) => c.id === parseInt(newOrder.customerId));
      if (!customer) return toast.error("❌ Invalid customer");

      const product = products.find((p) => p.id === parseInt(newOrder.productId));
      const totalAmount = product ? product.price * newOrder.quantity : 0;

      const nearestWarehouse = findNearestWarehouse(customer, warehouses);
      if (!nearestWarehouse) return toast.warning("⚠️ No nearby warehouse found");

      const orderData = {
        customerId: parseInt(newOrder.customerId),
        customerName: customer.name,
        address: newOrder.address || customer.address || "",
        productId: parseInt(newOrder.productId),
        quantity: Math.max(1, Number(newOrder.quantity) || 1),
        totalAmount,
        warehouseId: nearestWarehouse.id,
      };

      await ordersAPI.placeOrder(orderData);
      toast.success("✅ Order created successfully!");
      await fetchAllData();
    } catch (err) {
      console.error("❌ Failed to create order:", err);
      toast.error("Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = (order) => {
    toast.info(`📝 Edit order #${order.id} — feature under development`);
  };

  const handleCustomerSelect = (e) => {
    const selectedId = e.target.value;
    const selectedCustomer = customers.find((c) => c.id === parseInt(selectedId));
    setNewOrder({
      ...newOrder,
      customerId: selectedId,
      address: selectedCustomer?.address || "",
    });
  };

  const getAgentById = (id) => agents.find((a) => a.id === id);

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">🚚 Order Management</h2>

      {/* 🧾 Create Order Form */}
      <form onSubmit={(e) => e.preventDefault()} className="bg-blue-50 border p-4 rounded-lg space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            required
            value={newOrder.customerId}
            onChange={handleCustomerSelect}
            className="p-2 border rounded"
          >
            <option value="">Select Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            required
            value={newOrder.productId}
            onChange={(e) => setNewOrder({ ...newOrder, productId: e.target.value })}
            className="p-2 border rounded"
          >
            <option value="">Select Product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - ₹{p.price} ({p.weight ?? '—'} kg)
              </option>
            ))}
          </select>
        </div>

        <textarea
          required
          className="w-full p-2 border rounded"
          placeholder="Delivery Address"
          value={newOrder.address}
          onChange={(e) => setNewOrder({ ...newOrder, address: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          onClick={handleCreateOrder}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          {loading ? "Creating..." : "Create Order"}
        </button>
      </form>

      {/* 📋 Orders List (No Map) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orders.map((o) => {
          const agent = getAgentById(o.deliveryAgentId) || drivers.find((d) => d.id === o.deliveryAgentId);
          const product = products.find((p) => p.id === o.productId);
          const warehouse = warehouses.find((w) => w.id === o.warehouseId);

          return (
            <div key={o.id} className="border p-4 rounded-lg bg-white shadow-sm">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold text-gray-700">
                    #{o.id} — {o.customerName}
                  </h3>

                  <p className="text-sm text-gray-600">
                    🚗 Agent: {agent ? agent.name : "Unassigned"}
                  </p>

                  <p className="text-sm text-gray-600">
                    🏭 Warehouse: {warehouse ? warehouse.name : "—"}
                  </p>

                  <p className="text-sm text-gray-600">
                    📦 Product: {product ? `${product.name} (${product.weight ?? "—"} kg)` : "N/A"}
                  </p>

                  {/* 🏷️ Show price */}
                  <p className="text-sm text-gray-600">
                    💰 Price: ₹{product?.price} × {o.quantity} = ₹{o.totalAmount ? o.totalAmount.toFixed(2) : (product ? (product.price * (o.quantity || 1)).toFixed(2) : "—")}
                  </p>


                  <p className="text-sm text-gray-600">
                    📋 Status: <b>{o.status}</b>
                  </p>
                </div>

                <div className="flex flex-col gap-1 items-end">
                  <button
                    onClick={() => handleEditOrder(o)}
                    className="bg-blue-500 text-white px-2 py-[2px] rounded text-xs hover:bg-blue-600 leading-none"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Delete order #${o.id}?`)) return;
                      try {
                        await ordersAPI.delete(o.id);
                        toast.success("Order deleted");
                        await fetchAllData();
                      } catch (err) {
                        toast.error("Failed to delete");
                      }
                    }}
                    className="bg-red-500 text-white px-2 py-[2px] rounded text-xs hover:bg-red-600 leading-none"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
};

export default OrderManagementTab;

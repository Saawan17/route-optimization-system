import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { customersAPI, ordersAPI, productsAPI } from '../services/api';

// Fix Leaflet marker issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CustomerTab = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]); // 🆕 store all orders
  const [products, setProducts] = useState([]); // 🆕 store products for names
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    id: null,
    name: '',
    email: '',
    phone: '',
    address: '',
    pinCode: '',
    latitude: null,
    longitude: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomersAndOrders();
  }, []);

  const fetchCustomersAndOrders = async () => {
    try {
      const [custRes, orderRes, prodRes] = await Promise.all([
        customersAPI.getAll(),
        ordersAPI.getAll(),
        productsAPI.getAll(),
      ]);
      setCustomers(custRes.data || []);
      setOrders(orderRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('❌ Fetch failed:', err);
    }
  };

  const handleCreateOrUpdateCustomer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing && newCustomer.id) {
        await customersAPI.update(newCustomer.id, newCustomer);
      } else {
        await customersAPI.create(newCustomer);
      }
      await fetchCustomersAndOrders();
      resetForm();
    } catch (err) {
      console.error('❌ Error saving customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowCustomerForm(false);
    setIsEditing(false);
    setNewCustomer({
      id: null,
      name: '',
      email: '',
      phone: '',
      address: '',
      pinCode: '',
      latitude: null,
      longitude: null,
    });
  };

  // 🔍 Fetch coordinates from address or pin
  const handlePinSearch = async () => {
    if (!newCustomer.address && !newCustomer.pinCode) {
      alert('Please enter address or PIN code to search');
      return;
    }

    let cleanedAddress = `${newCustomer.address || ''} ${newCustomer.pinCode || ''}, India`
      .replace(/[\/\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/,+/g, ',')
      .trim();

    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanedAddress)}&format=json`
      );
      if (res.data?.length > 0) {
        const { lat, lon, display_name } = res.data[0];
        setNewCustomer((prev) => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          address: prev.address || display_name,
        }));
      } else alert('No matching location found.');
    } catch (err) {
      console.error('❌ Error fetching location:', err);
    }
  };

  const handleReverseGeocode = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      setNewCustomer((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        address: res.data?.display_name || '',
        pinCode: res.data?.address?.postcode || '',
      }));
    } catch (err) {
      console.error('❌ Reverse geocoding failed:', err);
    }
  };

  const LocationPicker = ({ latitude, longitude }) => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        handleReverseGeocode(lat, lng);
      },
    });
    return latitude && longitude ? (
      <Marker
        draggable
        position={[latitude, longitude]}
        eventHandlers={{
          dragend: (e) => {
            const { lat, lng } = e.target.getLatLng();
            handleReverseGeocode(lat, lng);
          },
        }}
      />
    ) : null;
  };

  const MapUpdater = ({ latitude, longitude }) => {
    const map = useMap();
    useEffect(() => {
      if (latitude && longitude) map.setView([latitude, longitude], 13);
    }, [latitude, longitude]);
    return null;
  };

  const handleEditCustomer = (customer) => {
    setIsEditing(true);
    setShowCustomerForm(true);
    setNewCustomer({ ...customer });
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await customersAPI.delete(id);
      await fetchCustomersAndOrders();
      alert('🗑️ Customer deleted successfully!');
    } catch (err) {
      console.error('❌ Error deleting customer:', err);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Customer Management</h2>

      <button
        onClick={() => resetForm() || setShowCustomerForm(true)}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        ➕ Add Customer
      </button>

      {showCustomerForm && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mt-4">
          <h3 className="text-lg font-semibold mb-4">
            {isEditing ? '✏️ Edit Customer' : '➕ Create Customer'}
          </h3>

          <form onSubmit={handleCreateOrUpdateCustomer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Name"
                className="p-2 border rounded"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Email / Identifier"
                className="p-2 border rounded"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
              <input
                type="tel"
                placeholder="Phone"
                className="p-2 border rounded"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
              <textarea
                placeholder="Address"
                className="p-2 border rounded"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </div>

            <div className="mt-4">
              <label className="block font-medium mb-1">Search by Address or PIN Code:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="p-2 border rounded flex-1"
                  placeholder="Enter address or PIN code"
                  value={newCustomer.pinCode}
                  onChange={(e) => setNewCustomer({ ...newCustomer, pinCode: e.target.value.trimStart() })}
                />
                <button
                  type="button"
                  onClick={handlePinSearch}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Search Map
                </button>
              </div>

              <div className="mt-4">
                <MapContainer
                  center={[newCustomer.latitude || 20.5937, newCustomer.longitude || 78.9629]}
                  zoom={newCustomer.latitude ? 13 : 5}
                  style={{ height: '450px', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                  />
                  <MapUpdater latitude={newCustomer.latitude} longitude={newCustomer.longitude} />
                  <LocationPicker latitude={newCustomer.latitude} longitude={newCustomer.longitude} />
                </MapContainer>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
              >
                {loading ? 'Saving...' : isEditing ? 'Update Customer' : 'Save Customer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">
          All Customers ({customers.length})
        </h3>

        {customers.length === 0 ? (
          <p className="text-gray-500">No customers found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((customer) => {
              const customerOrders = orders.filter(o => o.customerId === customer.id);
              return (
                <div
                  key={customer.id}
                  className="border border-gray-300 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => handleEditCustomer(customer)}
                      className="text-blue-600 hover:text-blue-800 text-lg"
                      title="Edit Customer"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer.id)}
                      className="text-red-600 hover:text-red-800 text-lg"
                      title="Delete Customer"
                    >
                      🗑️
                    </button>
                  </div>

                  <h4 className="font-semibold text-gray-800 text-lg mb-1">{customer.name}</h4>
                  <p className="text-sm text-gray-600"><strong>Email:</strong> {customer.email || 'N/A'}</p>
                  <p className="text-sm text-gray-600"><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
                  <p className="text-sm text-gray-600"><strong>Address:</strong> {customer.address || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mb-2"><strong>PIN:</strong> {customer.pinCode || 'N/A'}</p>

                  {/* 🧾 Orders Section */}
                  <div className="mt-2 border-t pt-2">
                    <p className="font-semibold text-gray-700">🧾 Orders ({customerOrders.length})</p>
                    {customerOrders.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No orders placed.</p>
                    ) : (
                      <ul className="list-disc ml-5 text-sm text-gray-700 mt-1">
                        {customerOrders.map((o) => {
                          const product = products.find((p) => p.id === o.productId);
                          return (
                            <li key={o.id}>
                              {product ? product.name : 'Unknown Product'} —{' '}
                              <span className="font-medium">{o.status}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerTab;

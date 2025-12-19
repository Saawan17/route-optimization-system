import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { merchantsAPI, productsAPI, ordersAPI, agentsAPI } from '../services/api';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MerchantTab = () => {
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showMerchantForm, setShowMerchantForm] = useState(false);
  const [isEditingMerchant, setIsEditingMerchant] = useState(false);
  const [newMerchant, setNewMerchant] = useState({
    id: null,
    name: '',
    email: '',
    phone: '',
    pinCode: '',
    latitude: null,
    longitude: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const res = await merchantsAPI.getAll();
      setMerchants(res.data);
      if (res.data.length > 0 && !selectedMerchant) setSelectedMerchant(res.data[0]);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch merchants');
    }
  };

  const handleCreateMerchant = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditingMerchant) {
        await merchantsAPI.update(selectedMerchant.id, newMerchant);
      } else {
        await merchantsAPI.create(newMerchant);
      }
      await fetchMerchants();
      setShowMerchantForm(false);
      setNewMerchant({
        id: null,
        name: '',
        email: '',
        phone: '',
        pinCode: '',
        latitude: null,
        longitude: null
      });
    } catch (err) {
      console.error(err);
      setError('Failed to save merchant');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Updated Map Search (with reverse geocode)
  const handlePinSearch = async () => {
    if (!newMerchant.pinCode) {
      alert('Enter PIN or location to search');
      return;
    }

    const query = `${newMerchant.pinCode}, India`;
    try {
      // Forward geocoding (PIN → lat/lon)
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`);
      if (res.data && res.data.length > 0) {
        const { lat, lon } = res.data[0];

        // ✅ Reverse geocode to get exact postal code
        const rev = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        );

        const detectedPin =
          rev.data?.address?.postcode || newMerchant.pinCode || '';

        setNewMerchant((prev) => ({
          ...prev,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          pinCode: detectedPin
        }));

        console.log(`✅ Found location: [${lat}, ${lon}] - PIN: ${detectedPin}`);
      } else {
        alert('No matching location found');
      }
    } catch (err) {
      console.error('Error fetching map location:', err);
      alert('Error fetching location');
    }
  };

  const MapUpdater = ({ latitude, longitude }) => {
    const map = useMap();
    useEffect(() => {
      if (latitude && longitude) {
        map.setView([latitude, longitude], 13);
      }
    }, [latitude, longitude]);
    return null;
  };

  const handleEditMerchant = (merchant) => {
    setNewMerchant({
      id: merchant.id,
      name: merchant.name,
      email: merchant.email || '',
      phone: merchant.phone || '',
      pinCode: merchant.pinCode || '',
      latitude: merchant.latitude || null,
      longitude: merchant.longitude || null
    });
    setIsEditingMerchant(true);
    setShowMerchantForm(true);
  };

  const handleDeleteMerchant = async (id) => {
    if (window.confirm('Are you sure you want to delete this merchant?')) {
      try {
        await merchantsAPI.delete(id);
        await fetchMerchants();
      } catch (err) {
        console.error(err);
        setError('Failed to delete merchant');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Merchant Management</h2>
        <button
          onClick={() => {
            setShowMerchantForm(true);
            setIsEditingMerchant(false);
            setNewMerchant({
              id: null,
              name: '',
              email: '',
              phone: '',
              pinCode: '',
              latitude: null,
              longitude: null
            });
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Add Merchant
        </button>
      </div>

      {showMerchantForm && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mt-4">
          <h3 className="text-lg font-semibold mb-4">
            {isEditingMerchant ? 'Edit Merchant' : 'Create Merchant'}
          </h3>

          <form onSubmit={handleCreateMerchant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Merchant Name"
                className="p-2 border rounded"
                value={newMerchant.name}
                onChange={(e) => setNewMerchant({ ...newMerchant, name: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                className="p-2 border rounded"
                value={newMerchant.email}
                onChange={(e) => setNewMerchant({ ...newMerchant, email: e.target.value })}
              />
              <input
                type="tel"
                placeholder="Phone"
                className="p-2 border rounded"
                value={newMerchant.phone}
                onChange={(e) => setNewMerchant({ ...newMerchant, phone: e.target.value })}
              />
            </div>

            {/* 📍 Map Section */}
            <div className="mt-4">
              <label className="block font-medium mb-1">PIN Code / Location:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="p-2 border rounded flex-1"
                  placeholder="Enter PIN code"
                  value={newMerchant.pinCode}
                  onChange={(e) => setNewMerchant({ ...newMerchant, pinCode: e.target.value })}
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
                  center={[20.5937, 78.9629]}
                  zoom={5}
                  style={{ height: '400px', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                  />
                  {newMerchant.latitude && newMerchant.longitude && (
                    <>
                      <MapUpdater
                        latitude={newMerchant.latitude}
                        longitude={newMerchant.longitude}
                      />
                      <Marker
                        draggable
                        position={[newMerchant.latitude, newMerchant.longitude]}
                        eventHandlers={{
                          dragend: async (e) => {
                            const { lat, lng } = e.target.getLatLng();

                            // ✅ Reverse-geocode when dragging marker
                            const rev = await axios.get(
                              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
                            );
                            const detectedPin = rev.data?.address?.postcode || '';

                            setNewMerchant((prev) => ({
                              ...prev,
                              latitude: lat,
                              longitude: lng,
                              pinCode: detectedPin
                            }));
                          }
                        }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
              >
                {loading ? 'Saving...' : 'Save Merchant'}
              </button>
              <button
                type="button"
                onClick={() => setShowMerchantForm(false)}
                className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ✅ Merchants List */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">All Merchants ({merchants.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {merchants.map((merchant) => (
            <div
              key={merchant.id}
              className={`border rounded-lg p-4 ${
                selectedMerchant?.id === merchant.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-800">{merchant.name}</h4>
                <button
                  onClick={() => handleDeleteMerchant(merchant.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  🗑️
                </button>
              </div>
              <p className="text-sm text-gray-600">📧 {merchant.email || 'N/A'}</p>
              <p className="text-sm text-gray-600">📞 {merchant.phone || 'N/A'}</p>
              <p className="text-sm text-gray-600">📍 PIN: {merchant.pinCode || 'N/A'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MerchantTab;

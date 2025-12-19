import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { warehousesAPI } from '../services/api';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const WarehouseTab = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newWarehouse, setNewWarehouse] = useState({
    id: null,
    name: '',
    address: '',
    pinCode: '',
    latitude: null,
    longitude: null,
    contactNumber: '',
    managerName: ''
  });

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await warehousesAPI.getAll();
      setWarehouses(res.data);
      if (res.data.length > 0 && !selectedWarehouse) setSelectedWarehouse(res.data[0]);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch warehouses.');
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        await warehousesAPI.update(newWarehouse.id, newWarehouse);
      } else {
        await warehousesAPI.create(newWarehouse);
      }
      await fetchWarehouses();
      setShowForm(false);
      setIsEditing(false);
      setNewWarehouse({
        id: null,
        name: '',
        address: '',
        pinCode: '',
        latitude: null,
        longitude: null,
        contactNumber: '',
        managerName: ''
      });
    } catch (err) {
      console.error(err);
      setError('Failed to save warehouse.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (wh) => {
    setNewWarehouse({
      id: wh.id,
      name: wh.name,
      address: wh.address || '',
      pinCode: wh.pinCode || '',
      latitude: wh.latitude || null,
      longitude: wh.longitude || null,
      contactNumber: wh.contactNumber || '',
      managerName: wh.managerName || ''
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await warehousesAPI.delete(id);
        await fetchWarehouses();
      } catch (err) {
        console.error(err);
        setError('Failed to delete warehouse.');
      }
    }
  };

  // Robust Map search using PIN / Address
  const handlePinSearch = async () => {
    // Trim inputs
    const pin = (newWarehouse.pinCode || '').trim();
    const addr = (newWarehouse.address || '').trim();

    if (!pin && !addr) {
      alert('Enter a PIN code or address to locate warehouse.');
      return;
    }

    // First try combined query (address + pin)
    let query = '';
    if (addr && pin) {
      query = `${addr} ${pin}, India`;
    } else if (addr) {
      query = `${addr}, India`;
    } else {
      query = `${pin}, India`;
    }

    console.log('🔍 Searching (primary) for:', query);

    try {
      let res = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`
      );

      // If no result and only pin provided, try postalcode parameter
      if ((!res.data || res.data.length === 0) && pin) {
        console.warn('No results for primary query. Trying postalcode search for PIN...');
        try {
          res = await axios.get(
            `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(pin)}&country=India&format=json`
          );
        } catch (innerErr) {
          console.error('postalcode search failed', innerErr);
        }
      }

      // If still no results, try fallback q=PIN, India (simple)
      if ((!res.data || res.data.length === 0) && pin) {
        console.warn('Postalcode search returned nothing. Trying fallback q=PIN, India...');
        res = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(pin + ', India')}&format=json`
        );
      }

      if (res.data && res.data.length > 0) {
        const { lat, lon, display_name } = res.data[0];

        // Reverse geocode to extract postcode (safer)
        try {
          const rev = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );
          const detectedPin = rev.data?.address?.postcode || pin || '';
          const detectedAddr = rev.data?.display_name || display_name || addr || '';

          setNewWarehouse((prev) => ({
            ...prev,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            pinCode: detectedPin,
            address: prev.address || detectedAddr
          }));

          console.log(`✅ Found location: [${lat}, ${lon}] - PIN: ${detectedPin}`);
        } catch (revErr) {
          // If reverse fails, still set lat/lon and display_name
          console.warn('Reverse geocode failed, using forward result', revErr);
          setNewWarehouse((prev) => ({
            ...prev,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            pinCode: pin || '',
            address: prev.address || display_name || ''
          }));
        }
      } else {
        alert('No matching location found. Try a more general address or verify the PIN code.');
      }
    } catch (err) {
      console.error('Error fetching map location:', err);
      alert('Error fetching location. Check console for details.');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Warehouse / Dark Store Management</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setIsEditing(false);
            setNewWarehouse({
              id: null,
              name: '',
              address: '',
              pinCode: '',
              latitude: null,
              longitude: null,
              contactNumber: '',
              managerName: ''
            });
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Add Warehouse
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {isEditing ? 'Edit Warehouse' : 'Create New Warehouse'}
          </h3>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Warehouse Name"
                className="p-2 border rounded"
                value={newWarehouse.name}
                onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
              />

              <input
                type="text"
                placeholder="Manager Name"
                className="p-2 border rounded"
                value={newWarehouse.managerName}
                onChange={(e) => setNewWarehouse({ ...newWarehouse, managerName: e.target.value })}
              />

              <input
                type="tel"
                placeholder="Contact Number"
                className="p-2 border rounded"
                value={newWarehouse.contactNumber}
                onChange={(e) => setNewWarehouse({ ...newWarehouse, contactNumber: e.target.value })}
              />

              <input
                type="text"
                placeholder="PIN Code"
                className="p-2 border rounded"
                value={newWarehouse.pinCode}
                onChange={(e) => setNewWarehouse({ ...newWarehouse, pinCode: e.target.value })}
              />
            </div>

            <textarea
              placeholder="Address"
              className="w-full p-2 border rounded"
              rows="3"
              value={newWarehouse.address}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
            />

            <div className="flex gap-2">
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
                style={{ height: '420px', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="© OpenStreetMap contributors"
                />
                {newWarehouse.latitude && newWarehouse.longitude && (
                  <>
                    <MapUpdater latitude={newWarehouse.latitude} longitude={newWarehouse.longitude} />
                    <Marker
                      draggable
                      position={[newWarehouse.latitude, newWarehouse.longitude]}
                      eventHandlers={{
                        dragend: async (e) => {
                          const { lat, lng } = e.target.getLatLng();
                          try {
                            const rev = await axios.get(
                              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
                            );
                            const detectedPin = rev.data?.address?.postcode || newWarehouse.pinCode || '';
                            const detectedAddr = rev.data?.display_name || newWarehouse.address || '';
                            setNewWarehouse((prev) => ({
                              ...prev,
                              latitude: lat,
                              longitude: lng,
                              pinCode: detectedPin,
                              address: detectedAddr
                            }));
                          } catch (revErr) {
                            console.warn('Reverse geocode failed during drag', revErr);
                            setNewWarehouse((prev) => ({
                              ...prev,
                              latitude: lat,
                              longitude: lng
                            }));
                          }
                        }
                      }}
                    />
                  </>
                )}
              </MapContainer>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
              >
                {loading ? 'Saving...' : 'Save Warehouse'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">
          All Warehouses ({warehouses.length})
        </h3>
        {warehouses.length === 0 ? (
          <p className="text-gray-500">No warehouses found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((wh) => (
              <div
                key={wh.id}
                className={`border rounded-lg p-4 hover:shadow-md transition ${
                  selectedWarehouse?.id === wh.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between">
                  <h4 className="font-semibold text-gray-800">{wh.name}</h4>
                  <div className="space-x-2">
                    <button onClick={() => handleEdit(wh)} className="text-blue-500 hover:text-blue-700">✏️</button>
                    <button onClick={() => handleDelete(wh.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">📍 {wh.address || 'N/A'}</p>
                <p className="text-sm text-gray-600">📮 {wh.pinCode || 'N/A'}</p>
                <p className="text-sm text-gray-600">📞 {wh.contactNumber || 'N/A'}</p>
                <p className="text-sm text-gray-600">👤 {wh.managerName || 'N/A'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseTab;

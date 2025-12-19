import '../polyfills'; // keep this first (you used this elsewhere)

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import axios from "axios";
import { toast } from "react-toastify";
import { useVehicleStore } from "../store/vehicleStore";
import {
  agentsAPI,
  ordersAPI,
  customersAPI,
  warehousesAPI,
} from "../services/api";

window.global = window;

// fix leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// emoji marker helper
const getEmojiIcon = (emoji, size = 28) =>
  new L.DivIcon({
    html: `<div style="font-size: ${size}px; line-height: 1">${emoji}</div>`,
    className: "emoji-marker",
    iconSize: [size, size],
    iconAnchor: [Math.floor(size / 2), Math.floor(size)],
  });

// haversine distance (km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
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

const isTwoWheeler = (a) =>
  String(a.vehicleCapacity || "").toUpperCase().includes("TWO");

const FitBoundsToRoute = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords?.length) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [80, 80] });
    }
  }, [coords, map]);
  return null;
};

// AnimatedRoute — animates a single agent along coords and updates vehiclePositions in store
const AnimatedRoute = ({
  coords = [],
  vehicleIcon = "🏍️",
  driverName = "",
  agentId,
  vehiclePositions,
  setVehiclePositions,
  speedMs = 120,
}) => {
  const [smoothCoords, setSmoothCoords] = useState([]);
  const timerRef = useRef(null);

  // smooth/interpolate
  useEffect(() => {
    if (!coords || coords.length < 2) {
      setSmoothCoords([]);
      return;
    }
    const interpolated = [];
    const STEPS_PER_SEGMENT = 20;
    for (let i = 0; i < coords.length - 1; i++) {
      const [lat1, lon1] = coords[i];
      const [lat2, lon2] = coords[i + 1];
      for (let step = 0; step < STEPS_PER_SEGMENT; step++) {
        const t = step / STEPS_PER_SEGMENT;
        interpolated.push([lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t]);
      }
    }
    interpolated.push(coords[coords.length - 1]);
    setSmoothCoords(interpolated);
    setVehiclePositions((prev) => ({ ...prev, [agentId]: 0 }));
  }, [coords, agentId, setVehiclePositions]);

  // // animate using timeouts
  // useEffect(() => {
  //   if (!smoothCoords.length || !agentId) return;
  //   let idx = vehiclePositions?.[agentId] || 0;

  //   const tick = () => {
  //     idx += 1;
  //     if (idx < smoothCoords.length) {
  //       setVehiclePositions((prev) => ({ ...prev, [agentId]: idx }));
  //       timerRef.current = setTimeout(tick, speedMs);
  //     } else {
  //       clearTimeout(timerRef.current);
  //     }
  //   };

  //   timerRef.current = setTimeout(tick, speedMs);
  //   return () => clearTimeout(timerRef.current);
  // }, [smoothCoords, agentId, vehiclePositions, setVehiclePositions, speedMs]);
  useEffect(() => {
    if (!smoothCoords.length || !agentId) return;

    // Create a local index stored in a ref to avoid losing progress
    const idxRef = { current: vehiclePositions?.[agentId] || 0 };

    const tick = () => {
      idxRef.current += 1;
      if (idxRef.current < smoothCoords.length) {
        setVehiclePositions((prev) => ({
          ...prev,
          [agentId]: idxRef.current,
        }));
        timerRef.current = setTimeout(tick, speedMs);
      } else {
        clearTimeout(timerRef.current);
      }
    };

    timerRef.current = setTimeout(tick, speedMs);

    // Cleanup when route changes
    return () => clearTimeout(timerRef.current);
  }, [smoothCoords, agentId, setVehiclePositions, speedMs]); // 🚫 Removed vehiclePositions dependency


  const progress = vehiclePositions?.[agentId] || 0;
  const currentPos = smoothCoords[progress] || smoothCoords[smoothCoords.length - 1];
  const remainingPath = smoothCoords.slice(progress);

  if (!currentPos) return null;

  return (
    <>
      <Polyline positions={remainingPath} color="purple" weight={5} opacity={0.9} />
      <Marker position={currentPos} icon={getEmojiIcon(vehicleIcon, 34)}>
        <Popup>{driverName}</Popup>
      </Marker>
    </>
  );
};

const DeliveryAgentTab = () => {
  const [agents, setAgents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [routes, setRoutes] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState("");
  const [editingAgent, setEditingAgent] = useState(null);
  const [editedData, setEditedData] = useState({ name: "", vehicleCapacity: "" });
  const [addingAgent, setAddingAgent] = useState(false);
  const [newAgentData, setNewAgentData] = useState({ name: "", phone: "", vehicleCapacity: "TWO_WHEELER" });

  const { vehiclePositions, setVehiclePositions } = useVehicleStore();
  const stompRef = useRef(null);

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
      const [agentsRes, ordersRes, customersRes, warehousesRes] = await Promise.all([
        agentsAPI.getAll(),
        ordersAPI.getAll(),
        customersAPI.getAll(),
        warehousesAPI.getAll(),
      ]);
      setAgents(agentsRes.data || []);
      setOrders(ordersRes.data || []);
      setCustomers(customersRes.data || []);
      setWarehouses(warehousesRes.data || []);
    } catch (err) {
      console.error("Fetch failed:", err);
      setError("Failed to load data");
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

  const getWarehouseById = (id) => warehouses.find((w) => w.id === id);
  const getAgentById = (id) => agents.find((a) => a.id === id);
  const getCustomerById = (id) => customers.find((c) => c.id === id);
  const getDriverLive = (agentId) => drivers.find((d) => d.id === agentId) || null;

  const getOptimizedMultiStopRoute = async (agent, activeOrders) => {
    try {
      const firstWarehouse = warehouses.find((w) => w.id === activeOrders[0].warehouseId);
      if (!firstWarehouse) return null;

      const coordsList = [];
      coordsList.push(`${firstWarehouse.longitude},${firstWarehouse.latitude}`);
      for (const o of activeOrders) {
        const c = getCustomerById(o.customerId);
        if (c?.latitude && c?.longitude) coordsList.push(`${c.longitude},${c.latitude}`);
      }

      const unique = Array.from(new Set(coordsList));
      if (unique.length < 2) return null;

      const res = await axios.get(`http://localhost:8080/api/routes/optimized`, {
        params: { coords: unique.join(";") },
      });

      const parsed = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      const feature = parsed?.features?.[0];
      if (!feature?.geometry?.coordinates?.length) return null;

      const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const distanceKm = (feature.properties.summary.distance || 0) / 1000;
      const durationMin = (feature.properties.summary.duration || 0) / 60;
      return { coords, distanceKm, durationMin };
    } catch (err) {
      console.error("Route optimization failed:", err);
      return null;
    }
  };

  useEffect(() => {
    const buildRoutes = async () => {
      for (const agent of agents) {
        // 🚫 Skip rebuilding if route already exists and still in toWarehouse phase
        if (routes[agent.id]?.phase === "toWarehouse") continue;

        const activeOrders = orders.filter(
          (o) => o.deliveryAgentId === agent.id && o.status !== "DELIVERED"
        );
        if (!activeOrders.length) {
          setRoutes((prev) => {
            if (!prev[agent.id]) return prev;
            const copy = { ...prev };
            delete copy[agent.id];
            return copy;
          });
          continue;
        }

        const assignedOrders = activeOrders.filter((o) => o.status === "ASSIGNED");
        const pickedUpOrders = activeOrders.filter((o) => o.status === "PICKED_UP");

        // 🟢 After pickup → compute multi-stop route (warehouse → customers)
        if (pickedUpOrders.length === activeOrders.length && activeOrders.length > 0) {
          const route = await getOptimizedMultiStopRoute(agent, activeOrders);
          if (route) {
            setRoutes((prev) => ({
              ...prev,
              [agent.id]: { ...route, phase: "multi", orderSequence: activeOrders.map(o => o.id) },
            }));
            setVehiclePositions((prev) => ({
              ...prev,
              [agent.id]: prev?.[agent.id] ?? 0,
            }));
          }
          continue;
        }

        // 🟠 Before pickup → move agent toward warehouse
        if (assignedOrders.length > 0) {
          const wh = warehouses.find(
            (w) => w.id === assignedOrders[0].warehouseId
          );
          if (!wh) continue;

          // ✅ Get driver's live OR static coordinates
          const driverLive = getDriverLive(agent.id);
          let dlat = null,
            dlng = null;
          if (
            driverLive &&
            (driverLive.latitude || driverLive.lat) &&
            (driverLive.longitude || driverLive.lng)
          ) {
            dlat = driverLive.latitude ?? driverLive.lat;
            dlng = driverLive.longitude ?? driverLive.lng;
          } else if (agent.latitude && agent.longitude) {
            dlat = agent.latitude;
            dlng = agent.longitude;
          }

          // ✅ Build single straight route only once
          if (dlat && dlng && wh?.latitude && wh?.longitude) {
            const steps = 80; // smooth interpolation points
            const coords = [];
            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              coords.push([
                dlat + (wh.latitude - dlat) * t,
                dlng + (wh.longitude - dlng) * t,
              ]);
            }

            const distanceKm = calculateDistance(
              dlat,
              dlng,
              wh.latitude,
              wh.longitude
            );
            const durationMin = Math.max(1, distanceKm / 0.4); // ~24 km/h

            // ✅ Save single, stable path
            setRoutes((prev) => ({
              ...prev,
              [agent.id]: {
                coords,
                distanceKm,
                durationMin,
                phase: "toWarehouse",
              },
            }));

            // reset vehicle animation start
            setVehiclePositions((prev) => ({ ...prev, [agent.id]: 0 }));
            continue;
          } else {
            // no valid driver location → fallback multi-stop
            const route = await getOptimizedMultiStopRoute(agent, activeOrders);
            if (route)
              setRoutes((prev) => ({
                ...prev,
                [agent.id]: { ...route, phase: "multi" },
              }));
            setVehiclePositions((prev) => ({ ...prev, [agent.id]: 0 }));
          }
        } else {
          // fallback: any other case (maybe partial pickup)
          const route = await getOptimizedMultiStopRoute(agent, activeOrders);
          if (route)
            setRoutes((prev) => ({
              ...prev,
              [agent.id]: { ...route, phase: "multi" },
            }));
          setVehiclePositions((prev) => ({
            ...prev,
            [agent.id]: prev?.[agent.id] ?? 0,
          }));
        }
      }
    };

    if (
      agents.length &&
      orders.length &&
      warehouses.length &&
      customers.length
    ) {
      buildRoutes();
    }
    // ⚙️ Removed drivers to prevent path resets each update
  }, [agents, orders, warehouses, customers, setVehiclePositions]);


  const handleEditAgent = (agent) => {
    setEditingAgent(agent);
    setEditedData({ name: agent.name || "", vehicleCapacity: agent.vehicleCapacity || "" });
  };

  const handleSaveAgent = async () => {
    try {
      await agentsAPI.update(editingAgent.id, editedData);
      toast.success("Agent updated");
      setEditingAgent(null);
      fetchAllData();
    } catch (err) {
      toast.error("Failed to update agent");
    }
  };

  const handleDeleteAgent = async (id) => {
    if (!window.confirm("Delete this agent?")) return;
    try {
      await agentsAPI.delete(id);
      toast.success("Agent deleted");
      fetchAllData();
    } catch (err) {
      toast.error("Failed to delete agent");
    }
  };

  const handleAddAgent = async () => {
    try {
      if (!newAgentData.name) return toast.warning("Enter agent name");
      await agentsAPI.create(newAgentData);
      toast.success("Agent added");
      setAddingAgent(false);
      setNewAgentData({ name: "", phone: "", vehicleCapacity: "TWO_WHEELER" });
      fetchAllData();
    } catch (err) {
      toast.error("Failed to add agent");
    }
  };

  const markPickedUp = async (order, agent) => {
    try {
      const wh = getWarehouseById(order.warehouseId);
      const driverLive = getDriverLive(agent.id);

      if (!wh) return toast.error("Warehouse not found");

      if (driverLive && driverLive.latitude && driverLive.longitude) {
        const dist = calculateDistance(driverLive.latitude, driverLive.longitude, wh.latitude, wh.longitude);
        if (dist > 3) {
          return toast.warning("Driver not near warehouse yet!");
        }
      }

      await ordersAPI.markPickedUp(order.id);
      toast.success(`Order #${order.id} marked PICKED_UP`);

      const activeOrders = orders.filter((o) => o.deliveryAgentId === agent.id && o.status !== "DELIVERED");
      const route = await getOptimizedMultiStopRoute(agent, activeOrders);
      if (route) {
        setRoutes((prev) => ({ ...prev, [agent.id]: { ...route, phase: "multi" } }));
        setVehiclePositions((prev) => ({ ...prev, [agent.id]: 0 }));
      }
      await fetchAllData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark picked up");
    }
  };

  // const markDelivered = async (order, agent) => {
  //   try {
  //     await ordersAPI.markDelivered(order.id);
  //     toast.success(`Order #${order.id} marked DELIVERED`);
  //     const activeOrders = orders.filter((o) => o.deliveryAgentId === agent.id && o.status !== "DELIVERED" && o.id !== order.id);
  //     if (activeOrders.length) {
  //       const route = await getOptimizedMultiStopRoute(agent, activeOrders);
  //       if (route) setRoutes((prev) => ({ ...prev, [agent.id]: { ...route, phase: "multi" } }));
  //     } else {
  //       setRoutes((prev) => {
  //         const c = { ...prev };
  //         delete c[agent.id];
  //         return c;
  //       });
  //     }
  //     await fetchAllData();
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Failed to mark delivered");
  //   }
  // };

  const markDelivered = async (order, agent) => {
    try {
      await ordersAPI.markDelivered(order.id);
      toast.success(`Order #${order.id} marked DELIVERED`);

      setRoutes((prev) => {
        const existing = prev[agent.id];
        if (!existing) return prev; // no route for agent yet

        // 🧩 Remove delivered order from sequence
        const remainingOrders = existing.orderSequence?.filter((oid) => oid !== order.id) || [];

        // 🧭 If no orders left, clear route
        if (remainingOrders.length === 0) {
          const copy = { ...prev };
          delete copy[agent.id];
          return copy;
        }

        // ✅ Keep same route & coords (no new path)
        // optionally: shorten coords if you want to “trim” completed stops
        return {
          ...prev,
          [agent.id]: {
            ...existing,
            orderSequence: remainingOrders,
            phase: "multi", // still multi
          },
        };
      });

      // Refresh orders list (status update)
      await fetchAllData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark delivered");
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case "AVAILABLE":
        return "bg-green-100 text-green-800";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800";
      case "ON_DELIVERY":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">🚚 Delivery Agent Dashboard</h2>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setAddingAgent(true); }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            ➕ Add Agent
          </button>
          <button
            onClick={fetchAllData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>}

      {/* Agent cards */}
      <div className="grid grid-cols-1 gap-4">
        {agents.map((agent) => {
          const activeOrders = orders.filter((o) => o.deliveryAgentId === agent.id && o.status !== "DELIVERED");
          const route = routes[agent.id];
          return (
            <div key={agent.id} className="border rounded-lg p-4 shadow-sm bg-white space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{agent.name}</h3>
                  <p className="text-sm text-gray-600">
                    {agent.vehicleCapacity === "FOUR_WHEELER" ? "🚚 Four Wheeler" : "🏍️ Two Wheeler"}
                  </p>
                  <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleEditAgent(agent)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">✏️</button>
                  <button onClick={() => handleDeleteAgent(agent.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">🗑️</button>
                </div>
              </div>

              {/* Active orders list */}
              <div>
                <p className="font-medium">🧾 Active Orders ({activeOrders.length})</p>
                {activeOrders.length ? (
                  <ul className="ml-4 mt-2 space-y-2 text-sm">
                    {activeOrders.map((o) => (
                      <li key={o.id} className="flex justify-between items-center">
                        <span>#{o.id} — {o.customerName} ({o.status})</span>
                        <div className="flex gap-2">
                          {o.status === "ASSIGNED" && (
                            <button onClick={() => markPickedUp(o, agent)} className="bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600">🚚 Mark Picked Up</button>
                          )}
                          {o.status === "PICKED_UP" && (
                            <button onClick={() => markDelivered(o, agent)} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">✅ Mark Delivered</button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-500">No active orders</p>
                )}
              </div>

              {/* Map area */}
              {route && route.coords && route.coords.length > 0 && (
                <div>
                  <h4 className="text-sm text-gray-700 mb-2">
                    {route.phase === "toWarehouse"
                      ? "➡️ En route to warehouse"
                      : `🗺️ Optimized Route (${activeOrders.length} stop${activeOrders.length > 1 ? "s" : ""})`}
                  </h4>

                  <MapContainer center={route.coords[0]} zoom={13} style={{ height: "280px", width: "100%", borderRadius: 8 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                    <FitBoundsToRoute coords={route.coords} />
                    {/* 
                    <Marker position={route.coords[0]} icon={getEmojiIcon("🏭")}>
                      <Popup>Warehouse</Popup>
                    </Marker> */}
                    {/* 🏭 Warehouse marker (always static) */}
                    {route.phase === "toWarehouse" && (
                      <Marker
                        position={route.coords[route.coords.length - 1]} // Always end of route
                        icon={getEmojiIcon("🏭")}
                      >
                        <Popup>Warehouse</Popup>
                      </Marker>
                    )}


                    {activeOrders.map((o) => {
                      const c = getCustomerById(o.customerId);
                      if (c?.latitude && c?.longitude) {
                        return (
                          <Marker key={o.id} position={[c.latitude, c.longitude]} icon={getEmojiIcon("🏠")}>
                            <Popup>Order #{o.id} — {c.name}</Popup>
                          </Marker>
                        );
                      }
                      return null;
                    })}

                    <AnimatedRoute
                      coords={route.coords}
                      vehicleIcon={isTwoWheeler(agent) ? "🏍️" : "🚚"}
                      driverName={agent.name}
                      agentId={agent.id}
                      vehiclePositions={vehiclePositions}
                      setVehiclePositions={setVehiclePositions}
                      speedMs={120}
                    />
                  </MapContainer>

                  <p className="text-sm text-gray-600 mt-2">
                    {/* 🛣 {Number(route.distanceKm || 0).toFixed(2)} km • ⏱ {Math.round(route.durationMin || 0)} min */}
                    {(() => {
                      const progress = vehiclePositions?.[agent.id] || 0;

                      const totalSteps = route.coords.length - 1;
                      const ratio = totalSteps > 0 ? progress / totalSteps : 0;

                      const remainingDistance = (route.distanceKm || 0) * (1 - ratio);
                      const remainingTime = (route.durationMin || 0) * (1 - ratio);

                      return (
                        <p className="text-sm text-gray-600 mt-2">
                          {(() => {
                            const progress = vehiclePositions?.[agent.id] || 0;
                            const smoothLen = route.coords.length - 1;

                            // detect arrival: when marker hits last smooth coordinate
                            const arrived = progress >= smoothLen;

                            // compute remaining distance/time only if not arrived
                            let remainingDistance = 0;
                            let remainingTime = 0;

                            if (!arrived) {
                              const ratio = progress / smoothLen;
                              remainingDistance = (route.distanceKm || 0) * (1 - ratio);
                              remainingTime = (route.durationMin || 0) * (1 - ratio);
                            }

                            return (
                              <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                                {arrived ? (
                                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                                    Arrived ✔
                                  </span>
                                ) : (
                                  <>
                                    <span>🛣 {remainingDistance.toFixed(2)} km</span>
                                    <span>•</span>
                                    <span>⏱ {Math.max(0, Math.round(remainingTime))} min</span>
                                  </>
                                )}
                              </div>
                            );
                          })()}


                        </p>
                      );
                    })()}

                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Agent Modal */}
      {addingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded shadow-md w-[500px]">
            <h3 className="text-lg font-semibold mb-3">➕ Add Agent</h3>

            <input
              type="text"
              placeholder="Name"
              className="w-full border p-2 rounded mb-3"
              value={newAgentData.name}
              onChange={(e) => setNewAgentData((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Phone"
              className="w-full border p-2 rounded mb-3"
              value={newAgentData.phone}
              onChange={(e) => setNewAgentData((p) => ({ ...p, phone: e.target.value }))}
            />

            <select
              className="w-full border p-2 rounded mb-3"
              value={newAgentData.vehicleCapacity}
              onChange={(e) => setNewAgentData((p) => ({ ...p, vehicleCapacity: e.target.value }))}
            >
              <option value="TWO_WHEELER">Two Wheeler</option>
              <option value="FOUR_WHEELER">Four Wheeler</option>
            </select>

            <input
              type="text"
              placeholder="PIN Code or Address"
              className="w-full border p-2 rounded mb-3"
              value={newAgentData.pinCode}
              onChange={(e) => setNewAgentData((p) => ({ ...p, pinCode: e.target.value }))}
            />

            <div className="flex gap-2 mb-3">
              <button
                onClick={async () => {
                  if (!newAgentData.pinCode) return toast.warning("Enter PIN or address to search");
                  try {
                    const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                      params: { q: newAgentData.pinCode, format: "json", addressdetails: 1, limit: 1 },
                    });
                    if (res.data.length) {
                      const { lat, lon, display_name } = res.data[0];
                      setNewAgentData((p) => ({
                        ...p,
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lon),
                        address: display_name,
                      }));
                      toast.success("📍 Location found on map");
                    } else {
                      toast.warning("No location found for that PIN/address");
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to search location");
                  }
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                🔍 Search Map
              </button>
            </div>

            <input
              type="text"
              placeholder="Full Address"
              className="w-full border p-2 rounded mb-3"
              value={newAgentData.address || ""}
              onChange={(e) => setNewAgentData((p) => ({ ...p, address: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="number"
                placeholder="Latitude"
                className="w-full border p-2 rounded"
                value={newAgentData.latitude || ""}
                onChange={(e) => setNewAgentData((p) => ({ ...p, latitude: parseFloat(e.target.value) }))}
              />
              <input
                type="number"
                placeholder="Longitude"
                className="w-full border p-2 rounded"
                value={newAgentData.longitude || ""}
                onChange={(e) => setNewAgentData((p) => ({ ...p, longitude: parseFloat(e.target.value) }))}
              />
            </div>

            {newAgentData.latitude && newAgentData.longitude && (
              <div className="mb-3">
                <MapContainer
                  center={[newAgentData.latitude, newAgentData.longitude]}
                  zoom={15}
                  style={{ height: "250px", width: "100%", borderRadius: 8 }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="© OpenStreetMap contributors"
                  />
                  <Marker
                    position={[newAgentData.latitude, newAgentData.longitude]}
                    icon={new L.DivIcon({
                      html: `<div style="font-size: 24px">📍</div>`,
                      className: "emoji-marker",
                    })}
                  >
                    <Popup>{newAgentData.address || "Selected location"}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAddingAgent(false)}
                className="bg-gray-400 text-white px-3 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAgent}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                Add Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h3 className="text-lg font-semibold mb-3">✏️ Edit Agent</h3>
            <input type="text" className="w-full border p-2 rounded mb-3" value={editedData.name} onChange={(e) => setEditedData((p) => ({ ...p, name: e.target.value }))} />
            <select className="w-full border p-2 rounded mb-3" value={editedData.vehicleCapacity} onChange={(e) => setEditedData((p) => ({ ...p, vehicleCapacity: e.target.value }))}>
              <option value="">Select Vehicle</option>
              <option value="TWO_WHEELER">Two Wheeler</option>
              <option value="FOUR_WHEELER">Four Wheeler</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingAgent(null)} className="bg-gray-400 text-white px-3 py-1 rounded">Cancel</button>
              <button onClick={handleSaveAgent} className="bg-blue-600 text-white px-3 py-1 rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryAgentTab;

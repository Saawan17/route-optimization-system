// Fix SockJS global issue (must be before imports)
window.global = window;

import React, { useState } from 'react';
import './App.css';
import MerchantTab from './components/MerchantTab.jsx';
import CustomerTab from './components/CustomerTab.jsx';
import DeliveryAgentTab from './components/DeliveryAgentTab.jsx';
import OrderManagementTab from './components/OrderManagementTab.jsx';
import WarehouseTab  from './components/WarehouseTab.jsx';  
import 'leaflet/dist/leaflet.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import logo from "./LogoNew.svg"

function App() {


  const [activeTab, setActiveTab] = useState('orders');

  const tabs = [
    { id: 'orders', label: 'Order Management', icon: '📦', component: OrderManagementTab },
    //{ id: 'merchant', label: 'Merchants', icon: '🏪', component: MerchantTab },
    { id: 'customer', label: 'Customers', icon: '👥', component: CustomerTab },
    { id: 'agent', label: 'Delivery Agents', icon: '🚚', component: DeliveryAgentTab },
    { id: 'warehouse', label: 'Warehouse', icon: '🏭', component: WarehouseTab },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Left Sidebar Navigation */}
        <div className="w-64 bg-white shadow-lg min-h-screen">
          <div className="p-6">
            <div className="mb-8 flex justify-center">
              <img src={logo} alt="QWQER Logo" className="h-12" />
            </div>
            
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                  }`}
                >
                  <span className="text-xl mr-3">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {ActiveComponent && <ActiveComponent />}
          </div>
        </div>
        <ToastContainer
        position="top-center"  // 👈 centered at top
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
      </div>
    </div>
  );
}

export default App;

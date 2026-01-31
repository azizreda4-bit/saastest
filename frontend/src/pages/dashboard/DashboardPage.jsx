// frontend/src/pages/dashboard/DashboardPage.jsx

import React from 'react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
      <p className="text-gray-700">
        Welcome to your dashboard! Here you can manage your activities and view reports.
      </p>

      {/* Example cards / widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-gray-600 mt-2">Total active users: 120</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold">Sales</h2>
          <p className="text-gray-600 mt-2">Revenue this month: $5,400</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <p className="text-gray-600 mt-2">Pending tasks: 8</p>
        </div>
      </div>
    </div>
  );
}

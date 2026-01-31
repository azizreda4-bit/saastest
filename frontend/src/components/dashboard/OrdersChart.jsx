import React from 'react';

const OrdersChart = ({ data = [] }) => {
  // Simple chart component using CSS for visualization
  const maxValue = Math.max(...data.map(item => item.orders || 0));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Commandes par jour</h3>
      
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <span className="text-4xl mb-2 block">📊</span>
            <p>Aucune donnée disponible</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.slice(-7).map((item, index) => {
            const percentage = maxValue > 0 ? (item.orders / maxValue) * 100 : 0;
            const date = new Date(item.date).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit'
            });
            
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-12 text-sm text-gray-600 font-medium">
                  {date}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-blue-500 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  >
                    <span className="text-white text-xs font-medium">
                      {item.orders}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total cette semaine</span>
          <span className="font-medium">
            {data.slice(-7).reduce((sum, item) => sum + (item.orders || 0), 0)} commandes
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrdersChart;
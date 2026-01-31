import React from 'react';

const RevenueChart = ({ data = [] }) => {
  // Simple revenue chart component
  const maxValue = Math.max(...data.map(item => item.revenue || 0));
  const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Chiffre d'affaires</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-sm text-gray-500">30 derniers jours</p>
        </div>
      </div>
      
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <span className="text-4xl mb-2 block">💰</span>
            <p>Aucune donnée de revenus</p>
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-end space-x-1">
          {data.slice(-30).map((item, index) => {
            const height = maxValue > 0 ? (item.revenue / maxValue) * 100 : 0;
            const date = new Date(item.date).getDate();
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center group">
                <div
                  className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600 relative group-hover:shadow-lg"
                  style={{ height: `${Math.max(height, 2)}%` }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatCurrency(item.revenue)}
                    <br />
                    {new Date(item.date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                {index % 5 === 0 && (
                  <span className="text-xs text-gray-500 mt-1">{date}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">Moyenne/jour</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(data.length > 0 ? totalRevenue / data.length : 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Meilleur jour</p>
          <p className="font-semibold text-green-600">
            {formatCurrency(maxValue)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Commandes</p>
          <p className="font-semibold text-gray-900">
            {data.reduce((sum, item) => sum + (item.orders || 0), 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
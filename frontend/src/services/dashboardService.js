// Dashboard service for fetching dashboard data
import apiService from './apiService';

class DashboardService {
  // Get dashboard overview stats
  async getOverview() {
    try {
      // For testing, return mock data
      return {
        success: true,
        data: {
          totalOrders: 1247,
          pendingOrders: 89,
          deliveredOrders: 1098,
          totalRevenue: 125430.50,
          monthlyGrowth: 12.5,
          activeCustomers: 456,
          deliveryProviders: 8,
          avgDeliveryTime: '2.3 jours'
        }
      };
    } catch (error) {
      console.error('Get dashboard overview error:', error);
      throw error;
    }
  }

  // Get recent orders
  async getRecentOrders(limit = 10) {
    try {
      // For testing, return mock data
      return {
        success: true,
        data: [
          {
            id: '1',
            orderNumber: 'ORD-001',
            customerName: 'Ahmed Benali',
            city: 'Casablanca',
            totalAmount: 299.99,
            status: 'pending',
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            orderNumber: 'ORD-002',
            customerName: 'Fatima Zahra',
            city: 'Rabat',
            totalAmount: 150.00,
            status: 'shipped',
            deliveryProvider: 'Coliix',
            createdAt: new Date(Date.now() - 86400000).toISOString()
          }
        ]
      };
    } catch (error) {
      console.error('Get recent orders error:', error);
      throw error;
    }
  }

  // Get delivery stats
  async getDeliveryStats() {
    try {
      return {
        success: true,
        data: {
          byStatus: {
            pending: 89,
            confirmed: 156,
            shipped: 234,
            delivered: 1098,
            cancelled: 45,
            returned: 23
          },
          byProvider: {
            'Coliix': 345,
            'Sendit': 289,
            'Forcelog': 234,
            'Cathedis': 198,
            'Speedaf': 156,
            'Autres': 125
          },
          byCities: {
            'Casablanca': 456,
            'Rabat': 234,
            'Marrakech': 189,
            'Fès': 145,
            'Tanger': 123,
            'Autres': 200
          }
        }
      };
    } catch (error) {
      console.error('Get delivery stats error:', error);
      throw error;
    }
  }

  // Get revenue analytics
  async getRevenueAnalytics(period = '30d') {
    try {
      // Generate mock data for the last 30 days
      const data = [];
      const now = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        data.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 5000) + 1000,
          orders: Math.floor(Math.random() * 50) + 10
        });
      }

      return {
        success: true,
        data: {
          chartData: data,
          totalRevenue: data.reduce((sum, item) => sum + item.revenue, 0),
          totalOrders: data.reduce((sum, item) => sum + item.orders, 0),
          avgOrderValue: data.reduce((sum, item) => sum + item.revenue, 0) / data.reduce((sum, item) => sum + item.orders, 0)
        }
      };
    } catch (error) {
      console.error('Get revenue analytics error:', error);
      throw error;
    }
  }

  // Get notifications
  async getNotifications() {
    try {
      return {
        success: true,
        data: [
          {
            id: '1',
            type: 'order',
            title: 'Nouvelle commande',
            message: 'Commande ORD-1247 reçue de Ahmed Benali',
            timestamp: new Date().toISOString(),
            read: false
          },
          {
            id: '2',
            type: 'delivery',
            title: 'Livraison en retard',
            message: 'Commande ORD-1245 en retard de 2 jours',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: false
          },
          {
            id: '3',
            type: 'system',
            title: 'Mise à jour système',
            message: 'Nouvelle version disponible',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            read: true
          }
        ]
      };
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markNotificationRead(notificationId) {
    try {
      // In a real app, this would make an API call
      return { success: true };
    } catch (error) {
      console.error('Mark notification read error:', error);
      throw error;
    }
  }

  // Get quick actions
  async getQuickActions() {
    try {
      return {
        success: true,
        data: [
          {
            id: 'create-order',
            title: 'Créer une commande',
            description: 'Ajouter une nouvelle commande',
            icon: '📦',
            href: '/orders/new'
          },
          {
            id: 'check-status',
            title: 'Vérifier statuts',
            description: 'Mettre à jour les statuts de livraison',
            icon: '🔄',
            action: 'check-status'
          },
          {
            id: 'send-notifications',
            title: 'Envoyer notifications',
            description: 'Notifier les clients par WhatsApp',
            icon: '💬',
            action: 'send-notifications'
          },
          {
            id: 'export-data',
            title: 'Exporter données',
            description: 'Télécharger rapport Excel',
            icon: '📊',
            action: 'export-data'
          }
        ]
      };
    } catch (error) {
      console.error('Get quick actions error:', error);
      throw error;
    }
  }
}

export default new DashboardService();
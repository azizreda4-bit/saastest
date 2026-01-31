// Netlify Function: Health Check
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'DeliveryHub API is running on Netlify!',
      version: '1.0.0',
      environment: 'production',
      platform: 'netlify',
      functions: {
        health: 'active',
        auth: 'active',
        orders: 'active',
        system: 'active'
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Swagger configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DeliveryHub API',
      version: '1.0.0',
      description: 'Multi-tenant SaaS platform for e-commerce order management and delivery provider integration',
      contact: {
        name: 'DeliveryHub Support',
        email: 'support@deliveryhub.ma',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.deliveryhub.ma/api/v1'
          : 'http://localhost:3000/api/v1',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        tenantHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Tenant-ID',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
            code: {
              type: 'string',
              example: 'ERROR_CODE',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'operator'],
            },
            isActive: {
              type: 'boolean',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            orderNumber: {
              type: 'string',
            },
            customerName: {
              type: 'string',
            },
            customerPhone: {
              type: 'string',
            },
            customerAddress: {
              type: 'string',
            },
            city: {
              type: 'string',
            },
            totalAmount: {
              type: 'number',
              format: 'decimal',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
            },
            deliveryProvider: {
              type: 'string',
            },
            trackingNumber: {
              type: 'string',
            },
            tenantId: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Tenant: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            domain: {
              type: 'string',
            },
            subscriptionPlan: {
              type: 'string',
              enum: ['starter', 'professional', 'enterprise'],
            },
            isActive: {
              type: 'boolean',
            },
            settings: {
              type: 'object',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
        tenantHeader: [],
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/models/*.js',
  ],
};

/**
 * Setup Swagger documentation
 */
function setupSwagger(app) {
  const specs = swaggerJsdoc(swaggerOptions);
  
  // Swagger UI options
  const swaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DeliveryHub API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  };

  // Serve Swagger documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  
  // Serve raw OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger documentation available at /api-docs');
}

module.exports = {
  setupSwagger,
  swaggerOptions,
};
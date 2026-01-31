-- ===============================================
-- DELIVERYHUB SAAS PLATFORM - DATABASE SCHEMA
-- E-Commerce Multi-Delivery Provider Management System
-- ===============================================

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- CORE TENANT & USER MANAGEMENT
-- ===============================================

-- Tenants (Organizations/Companies)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(255),
    logo_url VARCHAR(500),
    
    -- Subscription Management
    subscription_plan VARCHAR(50) DEFAULT 'starter', -- starter, professional, enterprise
    subscription_status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage Limits
    max_orders_per_month INTEGER DEFAULT 1000,
    max_users INTEGER DEFAULT 5,
    max_delivery_providers INTEGER DEFAULT 3,
    max_api_calls_per_day INTEGER DEFAULT 10000,
    
    -- Configuration
    settings JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'Africa/Casablanca',
    currency VARCHAR(3) DEFAULT 'MAD',
    language VARCHAR(5) DEFAULT 'fr',
    
    -- Billing
    billing_email VARCHAR(255),
    billing_address JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    
    -- Role & Permissions
    role VARCHAR(50) DEFAULT 'agent', -- owner, admin, manager, agent, viewer
    permissions JSONB DEFAULT '[]',
    
    -- Contact Info
    phone VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(32),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Sessions & Authentication
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password Reset Tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- DELIVERY PROVIDERS MANAGEMENT
-- ===============================================

-- Master Delivery Providers List
CREATE TABLE delivery_providers_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    website_url VARCHAR(255),
    
    -- API Configuration
    api_type VARCHAR(20) NOT NULL, -- token, session, api_key, oauth
    base_url VARCHAR(255),
    documentation_url VARCHAR(255),
    
    -- Supported Features
    supports_tracking BOOLEAN DEFAULT true,
    supports_cod BOOLEAN DEFAULT true,
    supports_scheduling BOOLEAN DEFAULT false,
    supports_returns BOOLEAN DEFAULT false,
    
    -- Geographic Coverage
    supported_countries TEXT[] DEFAULT ARRAY['MA'],
    supported_cities JSONB DEFAULT '[]',
    
    -- Configuration Schema
    configuration_schema JSONB, -- JSON schema for provider config
    webhook_events JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Delivery Provider Configurations
CREATE TABLE tenant_delivery_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES delivery_providers_master(id) ON DELETE CASCADE,
    
    -- Configuration
    display_name VARCHAR(100),
    is_enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0,
    
    -- Credentials (encrypted)
    credentials JSONB NOT NULL,
    settings JSONB DEFAULT '{}',
    
    -- Usage Statistics
    total_orders INTEGER DEFAULT 0,
    successful_orders INTEGER DEFAULT 0,
    failed_orders INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, provider_id)
);

-- Cities and Delivery Zones
CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    name_fr VARCHAR(100),
    country_code VARCHAR(2) DEFAULT 'MA',
    region VARCHAR(100),
    postal_code VARCHAR(20),
    coordinates POINT,
    population INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider City Mappings (for API IDs)
CREATE TABLE provider_city_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES delivery_providers_master(id) ON DELETE CASCADE,
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    provider_city_id VARCHAR(50) NOT NULL,
    provider_city_name VARCHAR(100),
    delivery_zones JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider_id, city_id)
);

-- ===============================================
-- PRODUCT & INVENTORY MANAGEMENT
-- ===============================================

-- Product Categories
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    parent_id UUID REFERENCES product_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id),
    
    -- Basic Info
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description TEXT,
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    compare_at_price DECIMAL(10,2),
    
    -- Physical Properties
    weight DECIMAL(8,3), -- in kg
    dimensions JSONB, -- {length, width, height} in cm
    
    -- Media
    images TEXT[],
    featured_image VARCHAR(500),
    
    -- Inventory
    track_inventory BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    
    -- SEO & Marketing
    meta_title VARCHAR(255),
    meta_description TEXT,
    tags TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, sku)
);

-- Product Variants (Colors, Sizes, etc.)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Variant Attributes
    attributes JSONB, -- {color: "blue", size: "L"}
    
    -- Pricing (can override product price)
    price DECIMAL(10,2),
    cost DECIMAL(10,2),
    compare_at_price DECIMAL(10,2),
    
    -- Inventory
    stock_quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    
    -- Media
    image_url VARCHAR(500),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- CUSTOMER MANAGEMENT
-- ===============================================

-- Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Personal Info
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    
    -- Address Info
    city_id UUID REFERENCES cities(id),
    address TEXT,
    postal_code VARCHAR(20),
    
    -- Customer Insights
    customer_segment VARCHAR(50), -- vip, regular, new, at_risk
    preferred_contact_method VARCHAR(20) DEFAULT 'whatsapp', -- whatsapp, sms, email, phone
    language_preference VARCHAR(5) DEFAULT 'fr',
    
    -- Statistics
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    last_order_date TIMESTAMP WITH TIME ZONE,
    
    -- Marketing
    accepts_marketing BOOLEAN DEFAULT true,
    marketing_source VARCHAR(100),
    
    -- Notes
    notes TEXT,
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);

-- Customer Addresses (Multiple addresses per customer)
CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'shipping', -- shipping, billing
    
    -- Address Details
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(100),
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city_id UUID REFERENCES cities(id),
    postal_code VARCHAR(20),
    phone VARCHAR(20),
    
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- ORDER MANAGEMENT
-- ===============================================

-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    
    -- Customer Information
    customer_id UUID REFERENCES customers(id),
    agent_id UUID REFERENCES users(id),
    
    -- Customer Info (denormalized for performance)
    customer_name VARCHAR(200),
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255),
    
    -- Delivery Address
    city_id UUID REFERENCES cities(id),
    city_name VARCHAR(100),
    address TEXT NOT NULL,
    postal_code VARCHAR(20),
    
    -- Order Financial Details
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MAD',
    
    -- Status Management
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled, returned, refunded
    confirmation_status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, rejected, no_response, callback_requested
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled', -- unfulfilled, partial, fulfilled
    
    -- Delivery Information
    delivery_provider_id UUID REFERENCES delivery_providers_master(id),
    delivery_config_id UUID REFERENCES tenant_delivery_configs(id),
    tracking_number VARCHAR(100),
    delivery_status VARCHAR(50),
    delivery_notes TEXT,
    delivery_attempts INTEGER DEFAULT 0,
    
    -- Delivery Dates
    estimated_delivery_date DATE,
    promised_delivery_date DATE,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    
    -- Marketing Attribution
    source VARCHAR(50), -- facebook, tiktok, instagram, google, direct, referral
    medium VARCHAR(50), -- cpc, social, organic, email, referral
    campaign VARCHAR(100),
    ad_set VARCHAR(100),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(50),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    
    -- Customer Service
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    tags TEXT[],
    internal_notes TEXT,
    customer_notes TEXT,
    
    -- Fraud Detection
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high
    fraud_score DECIMAL(3,2),
    
    -- Important Timestamps
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- System Fields
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_reason TEXT,
    duplicate_of_order_id UUID REFERENCES orders(id),
    sync_status VARCHAR(20) DEFAULT 'pending', -- pending, synced, failed, retrying
    sync_error TEXT,
    sync_attempts INTEGER DEFAULT 0,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, order_number)
);

-- Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_variant_id UUID REFERENCES product_variants(id),
    
    -- Product Info (denormalized for historical accuracy)
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    variant_attributes JSONB,
    
    -- Pricing
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Fulfillment
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled',
    fulfilled_quantity INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Status History
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    -- Status Change
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    status_type VARCHAR(20) NOT NULL, -- order, confirmation, payment, fulfillment, delivery
    
    -- Details
    reason VARCHAR(100),
    notes TEXT,
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- COMMUNICATION & NOTIFICATIONS
-- ===============================================

-- WhatsApp Business API Configurations
CREATE TABLE whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- WhatsApp Business API Details
    phone_number_id VARCHAR(50) NOT NULL,
    business_account_id VARCHAR(50),
    access_token TEXT NOT NULL,
    webhook_verify_token VARCHAR(100),
    
    -- Configuration
    display_name VARCHAR(100),
    profile_picture_url VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_status VARCHAR(50),
    
    -- Usage Limits
    daily_message_limit INTEGER DEFAULT 1000,
    messages_sent_today INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Templates
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Template Info
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- order_confirmation, delivery_update, marketing, support
    type VARCHAR(50) NOT NULL, -- order_confirmation, shipping_update, delivery_confirmation, etc.
    
    -- Channel Configuration
    channel VARCHAR(20) NOT NULL, -- whatsapp, sms, email
    language VARCHAR(5) DEFAULT 'fr',
    
    -- Template Content
    subject VARCHAR(255), -- for email
    template TEXT NOT NULL,
    variables JSONB, -- available template variables
    
    -- WhatsApp Specific
    whatsapp_template_name VARCHAR(100), -- approved template name
    whatsapp_template_status VARCHAR(50), -- pending, approved, rejected
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name, channel)
);

-- Communication Log
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    customer_id UUID REFERENCES customers(id),
    template_id UUID REFERENCES message_templates(id),
    
    -- Message Details
    channel VARCHAR(20) NOT NULL, -- whatsapp, sms, email, voice
    type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) DEFAULT 'outbound', -- outbound, inbound
    
    -- Recipients
    recipient VARCHAR(255) NOT NULL,
    sender VARCHAR(255),
    
    -- Content
    subject VARCHAR(255),
    message TEXT NOT NULL,
    media_urls TEXT[],
    
    -- Delivery Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, read, failed
    external_id VARCHAR(100), -- provider message ID
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB,
    cost DECIMAL(8,4), -- message cost
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- AUTOMATION & WORKFLOWS
-- ===============================================

-- Automation Rules
CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Rule Info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- order_management, customer_service, marketing
    
    -- Trigger Configuration
    trigger_event VARCHAR(50) NOT NULL, -- order_created, status_changed, delivery_updated, etc.
    trigger_conditions JSONB, -- conditions that must be met
    
    -- Actions
    actions JSONB, -- actions to perform
    
    -- Execution Settings
    is_active BOOLEAN DEFAULT true,
    execution_delay_minutes INTEGER DEFAULT 0,
    max_executions_per_order INTEGER DEFAULT 1,
    
    -- Statistics
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation Execution Log
CREATE TABLE automation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    customer_id UUID REFERENCES customers(id),
    
    -- Execution Details
    trigger_data JSONB,
    actions_performed JSONB,
    
    -- Results
    status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed, skipped
    error_message TEXT,
    execution_time_ms INTEGER,
    
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- ANALYTICS & REPORTING
-- ===============================================

-- User Activity Sessions
CREATE TABLE user_activity_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Session Details
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    
    -- Activity Metrics
    actions_count INTEGER DEFAULT 0,
    orders_created INTEGER DEFAULT 0,
    orders_updated INTEGER DEFAULT 0,
    
    -- Technical Details
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(20), -- desktop, mobile, tablet
    browser VARCHAR(50),
    os VARCHAR(50)
);

-- Daily Analytics Summary
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Order Metrics
    total_orders INTEGER DEFAULT 0,
    confirmed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    delivered_orders INTEGER DEFAULT 0,
    returned_orders INTEGER DEFAULT 0,
    
    -- Revenue Metrics
    total_revenue DECIMAL(12,2) DEFAULT 0,
    confirmed_revenue DECIMAL(12,2) DEFAULT 0,
    delivered_revenue DECIMAL(12,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    
    -- Customer Metrics
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    
    -- Delivery Provider Performance
    provider_stats JSONB, -- {provider_id: {orders: X, success_rate: Y, avg_delivery_time: Z}}
    
    -- Marketing Attribution
    source_stats JSONB, -- {facebook: {orders: X, revenue: Y, conversion_rate: Z}}
    
    -- Geographic Distribution
    city_stats JSONB, -- {city_id: {orders: X, revenue: Y}}
    
    -- Communication Stats
    messages_sent INTEGER DEFAULT 0,
    whatsapp_messages INTEGER DEFAULT 0,
    sms_messages INTEGER DEFAULT 0,
    email_messages INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, date)
);

-- ===============================================
-- SYSTEM CONFIGURATION & INTEGRATIONS
-- ===============================================

-- System Settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50), -- app, security, integrations, billing
    is_public BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys and Access Tokens
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    -- Key Details
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- first 8 chars for identification
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    
    -- Permissions
    permissions JSONB DEFAULT '[]',
    rate_limit_per_hour INTEGER DEFAULT 1000,
    
    -- Usage Tracking
    total_requests INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Webhook Configuration
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL, -- ['order.created', 'order.updated', 'delivery.status_changed']
    
    -- Security
    secret VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Statistics
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    last_delivery_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Delivery Log
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    
    -- Delivery Details
    http_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_retry_at TIMESTAMP WITH TIME ZONE
);

-- Background Jobs Queue
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Job Details
    job_type VARCHAR(50) NOT NULL, -- sync_orders, send_notifications, generate_reports
    queue VARCHAR(50) DEFAULT 'default',
    priority INTEGER DEFAULT 0,
    
    -- Payload
    payload JSONB NOT NULL,
    
    -- Execution
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed, retrying
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Results
    result JSONB,
    error_message TEXT,
    
    -- Timing
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- BILLING & SUBSCRIPTIONS
-- ===============================================

-- Subscription Plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Pricing
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'MAD',
    
    -- Limits
    max_orders_per_month INTEGER,
    max_users INTEGER,
    max_delivery_providers INTEGER,
    max_api_calls_per_day INTEGER,
    max_whatsapp_messages_per_month INTEGER,
    
    -- Features
    features JSONB, -- list of included features
    
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription History
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    
    -- Subscription Details
    status VARCHAR(20) NOT NULL, -- active, cancelled, expired, suspended
    billing_cycle VARCHAR(20), -- monthly, yearly
    
    -- Pricing
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MAD',
    
    -- Dates
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Usage Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metrics
    orders_count INTEGER DEFAULT 0,
    api_calls_count INTEGER DEFAULT 0,
    whatsapp_messages_count INTEGER DEFAULT 0,
    sms_messages_count INTEGER DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    
    -- Costs
    total_cost DECIMAL(10,4) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, period_start, period_end)
);

-- ===============================================
-- COMPREHENSIVE INDEXES FOR PERFORMANCE
-- ===============================================

-- Tenant and User Indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Order Indexes
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_confirmation_status ON orders(confirmation_status);
CREATE INDEX idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_tracking_number ON orders(tracking_number);
CREATE INDEX idx_orders_sync_status ON orders(sync_status);
CREATE INDEX idx_orders_source ON orders(source);
CREATE INDEX idx_orders_agent_id ON orders(agent_id);
CREATE INDEX idx_orders_delivery_provider ON orders(delivery_provider_id);

-- Customer Indexes
CREATE INDEX idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX idx_customers_city ON customers(city_id);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_segment ON customers(customer_segment);

-- Product Indexes
CREATE INDEX idx_products_tenant_sku ON products(tenant_id, sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- Communication Indexes
CREATE INDEX idx_communications_order ON communications(order_id);
CREATE INDEX idx_communications_customer ON communications(customer_id);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_communications_channel ON communications(channel);
CREATE INDEX idx_communications_created ON communications(created_at);

-- Analytics Indexes
CREATE INDEX idx_daily_analytics_tenant_date ON daily_analytics(tenant_id, date);
CREATE INDEX idx_user_activity_sessions_user ON user_activity_sessions(user_id);
CREATE INDEX idx_user_activity_sessions_tenant ON user_activity_sessions(tenant_id);

-- System Indexes
CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_queue ON background_jobs(queue);
CREATE INDEX idx_background_jobs_scheduled ON background_jobs(scheduled_at);
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_automation_executions_rule ON automation_executions(rule_id);

-- ===============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===============================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Order status history trigger
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, from_status, to_status, status_type, created_at)
        VALUES (NEW.id, OLD.status, NEW.status, 'order', NOW());
    END IF;
    
    IF OLD.confirmation_status IS DISTINCT FROM NEW.confirmation_status THEN
        INSERT INTO order_status_history (order_id, from_status, to_status, status_type, created_at)
        VALUES (NEW.id, OLD.confirmation_status, NEW.confirmation_status, 'confirmation', NOW());
    END IF;
    
    IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
        INSERT INTO order_status_history (order_id, from_status, to_status, status_type, created_at)
        VALUES (NEW.id, OLD.delivery_status, NEW.delivery_status, 'delivery', NOW());
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_order_status_changes 
    AFTER UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION log_order_status_change();

-- ===============================================
-- INITIAL DATA SEEDING
-- ===============================================

-- Insert subscription plans
INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, max_orders_per_month, max_users, max_delivery_providers, max_api_calls_per_day, features) VALUES
('Starter', 'starter', 299.00, 2990.00, 1000, 3, 3, 5000, '["basic_analytics", "whatsapp_integration", "3_delivery_providers"]'),
('Professional', 'professional', 599.00, 5990.00, 5000, 10, 10, 20000, '["advanced_analytics", "automation_rules", "custom_templates", "priority_support"]'),
('Enterprise', 'enterprise', 1299.00, 12990.00, 25000, 50, 25, 100000, '["unlimited_features", "custom_integrations", "dedicated_support", "white_label"]');

-- Insert default delivery providers
INSERT INTO delivery_providers_master (name, slug, api_type, base_url, supported_countries, configuration_schema) VALUES
('Coliix', 'coliix', 'api_key', 'https://my.coliix.com/casa/seller/api-parcels', ARRAY['MA'], '{"api_key": {"type": "string", "required": true, "description": "Your Coliix API key"}}'),
('Cathedis', 'cathedis', 'session', 'https://api.cathedis.delivery', ARRAY['MA'], '{"username": {"type": "string", "required": true}, "password": {"type": "string", "required": true}}'),
('Forcelog', 'forcelog', 'api_key', 'https://api.forcelog.ma', ARRAY['MA'], '{"api_key": {"type": "string", "required": true}}'),
('Sendit', 'sendit', 'token', 'https://app.sendit.ma/api/v1', ARRAY['MA'], '{"access_token": {"type": "string", "required": true}}'),
('OzonExpress', 'ozonexpress', 'api_key', 'https://api.ozonexpress.ma', ARRAY['MA'], '{"api_key": {"type": "string", "required": true}}'),
('Speedaf', 'speedaf', 'api_key', 'https://api.speedaf.com', ARRAY['MA'], '{"api_key": {"type": "string", "required": true}}'),
('Ameex', 'ameex', 'token', 'https://api.ameex.ma', ARRAY['MA'], '{"access_token": {"type": "string", "required": true}}'),
('Vitex', 'vitex', 'session', 'https://vitex.ma', ARRAY['MA'], '{"email": {"type": "string", "required": true}, "password": {"type": "string", "required": true}}');

-- Insert major Moroccan cities
INSERT INTO cities (name, name_ar, name_fr, country_code, region) VALUES
('Casablanca', 'الدار البيضاء', 'Casablanca', 'MA', 'Casablanca-Settat'),
('Rabat', 'الرباط', 'Rabat', 'MA', 'Rabat-Salé-Kénitra'),
('Fès', 'فاس', 'Fès', 'MA', 'Fès-Meknès'),
('Marrakech', 'مراكش', 'Marrakech', 'MA', 'Marrakech-Safi'),
('Agadir', 'أكادير', 'Agadir', 'MA', 'Souss-Massa'),
('Tanger', 'طنجة', 'Tanger', 'MA', 'Tanger-Tétouan-Al Hoceïma'),
('Meknès', 'مكناس', 'Meknès', 'MA', 'Fès-Meknès'),
('Oujda', 'وجدة', 'Oujda', 'MA', 'Oriental'),
('Kénitra', 'القنيطرة', 'Kénitra', 'MA', 'Rabat-Salé-Kénitra'),
('Tétouan', 'تطوان', 'Tétouan', 'MA', 'Tanger-Tétouan-Al Hoceïma');

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('app_name', '"DeliveryHub"', 'Application name', 'app', true),
('app_version', '"1.0.0"', 'Current application version', 'app', true),
('app_url', '"https://deliveryhub.ma"', 'Application base URL', 'app', true),
('max_file_upload_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'app', false),
('session_timeout_minutes', '60', 'User session timeout in minutes', 'security', false),
('default_currency', '"MAD"', 'Default currency code', 'app', true),
('supported_languages', '["en", "fr", "ar"]', 'Supported application languages', 'app', true),
('whatsapp_api_version', '"v20.0"', 'WhatsApp Business API version', 'integrations', false),
('default_timezone', '"Africa/Casablanca"', 'Default application timezone', 'app', true);

-- ===============================================
-- VIEWS FOR COMMON QUERIES
-- ===============================================

-- Comprehensive order view with all related data
CREATE VIEW order_details AS
SELECT 
    o.id,
    o.tenant_id,
    o.order_number,
    o.customer_name,
    o.customer_phone,
    o.customer_email,
    o.city_name,
    o.address,
    o.total_amount,
    o.currency,
    o.status,
    o.confirmation_status,
    o.payment_status,
    o.delivery_status,
    o.tracking_number,
    dp.name as delivery_provider_name,
    dp.slug as delivery_provider_slug,
    o.source,
    o.campaign,
    o.order_date,
    o.confirmed_at,
    o.shipped_at,
    o.delivered_at,
    u.first_name || ' ' || u.last_name as agent_name,
    c.total_orders as customer_total_orders,
    c.total_spent as customer_total_spent,
    t.name as tenant_name
FROM orders o
LEFT JOIN delivery_providers_master dp ON o.delivery_provider_id = dp.id
LEFT JOIN users u ON o.agent_id = u.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN tenants t ON o.tenant_id = t.id;

-- Daily performance metrics view
CREATE VIEW daily_performance AS
SELECT 
    da.tenant_id,
    da.date,
    da.total_orders,
    da.confirmed_orders,
    da.delivered_orders,
    da.cancelled_orders,
    CASE WHEN da.total_orders > 0 THEN ROUND((da.confirmed_orders::DECIMAL / da.total_orders * 100), 2) ELSE 0 END as confirmation_rate,
    CASE WHEN da.confirmed_orders > 0 THEN ROUND((da.delivered_orders::DECIMAL / da.confirmed_orders * 100), 2) ELSE 0 END as delivery_rate,
    da.total_revenue,
    da.confirmed_revenue,
    da.delivered_revenue,
    da.average_order_value,
    da.new_customers,
    da.returning_customers,
    t.name as tenant_name
FROM daily_analytics da
LEFT JOIN tenants t ON da.tenant_id = t.id;

-- Tenant usage summary view
CREATE VIEW tenant_usage_summary AS
SELECT 
    t.id,
    t.name,
    t.subscription_plan,
    t.subscription_status,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT tdc.id) as active_delivery_providers,
    COUNT(DISTINCT o.id) FILTER (WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days') as orders_last_30_days,
    COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days') as messages_last_30_days,
    t.created_at as tenant_created_at
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = true
LEFT JOIN tenant_delivery_configs tdc ON t.id = tdc.tenant_id AND tdc.is_enabled = true
LEFT JOIN orders o ON t.id = o.tenant_id
LEFT JOIN communications c ON t.id = c.tenant_id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name, t.subscription_plan, t.subscription_status, t.created_at;

-- ===============================================
-- SECURITY POLICIES (Row Level Security)
-- ===============================================

-- Enable RLS on tenant-specific tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

-- Example policies (to be implemented based on authentication system)
-- CREATE POLICY tenant_isolation_orders ON orders
--     FOR ALL TO authenticated
--     USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ===============================================
-- COMMENTS AND DOCUMENTATION
-- ===============================================

COMMENT ON TABLE tenants IS 'Multi-tenant organizations using the platform';
COMMENT ON TABLE users IS 'Users belonging to tenants with role-based access control';
COMMENT ON TABLE orders IS 'Main orders table with comprehensive order lifecycle tracking';
COMMENT ON TABLE delivery_providers_master IS 'Master catalog of all supported delivery providers';
COMMENT ON TABLE tenant_delivery_configs IS 'Tenant-specific delivery provider configurations and credentials';
COMMENT ON TABLE communications IS 'Complete log of all customer communications across all channels';
COMMENT ON TABLE automation_rules IS 'Business automation rules and workflow definitions';
COMMENT ON TABLE daily_analytics IS 'Pre-aggregated daily metrics for fast reporting and analytics';
COMMENT ON TABLE background_jobs IS 'Asynchronous job queue for background processing';
COMMENT ON TABLE webhook_deliveries IS 'Log of all webhook delivery attempts and responses';

-- ===============================================
-- END OF COMPREHENSIVE SAAS SCHEMA
-- ===============================================
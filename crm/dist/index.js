import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
// CRM Core Routes
import { contactRoutes } from './routes/contacts.js';
import { companyRoutes } from './routes/companies.js';
import { dealRoutes } from './routes/deals.js';
import { activityRoutes } from './routes/activities.js';
import { emailRoutes } from './routes/emails.js';
// ThingsBoard Integration Routes
import { deviceAssignmentRoutes } from './routes/device-assignments.js';
import { serviceTicketRoutes } from './routes/service-tickets.js';
// Feedback & AI Routes
import { feedbackRoutes } from './routes/feedback.js';
import { chatRoutes } from './routes/chat.js';
// Enterprise Routes
import { authRoutes } from './routes/auth.js';
import { otpRoutes } from './routes/otp.js';
import { tenantRoutes } from './routes/tenants.js';
import { userRoutes } from './routes/users.js';
import { vendorRoutes } from './routes/vendors.js';
import { itemRoutes } from './routes/items.js';
import { contractRoutes } from './routes/contracts.js';
import { billingRoutes } from './routes/billing.js';
import { notificationRoutes } from './routes/notifications.js';
import { messagingRoutes } from './routes/messaging.js';
import { auditLogRoutes } from './routes/audit-logs.js';
import { supportRoutes } from './routes/support.js';
import { webhookRoutes } from './routes/webhooks.js';
import { contactFormRoutes } from './routes/contact-form.js';
// Services
import { prisma } from './services/prisma.js';
import { registerJwt } from './middleware/auth.js';
import { setupWebSocket } from './services/websocket.js';
import { setupChatHandler } from './services/openai.js';
const fastify = Fastify({
    logger: true,
});
async function bootstrap() {
    // Register plugins
    await fastify.register(cors, {
        origin: true,
    });
    // Multipart for file uploads
    await fastify.register(multipart, {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB max file size
            files: 1, // Max 1 file per request
        },
    });
    // Rate limiting
    await fastify.register(rateLimit, {
        max: 500,
        timeWindow: '1 minute',
    });
    // JWT Authentication
    await registerJwt(fastify);
    // WebSocket
    await setupWebSocket(fastify);
    // Setup OpenAI chat handler
    setupChatHandler();
    // Swagger documentation
    await fastify.register(swagger, {
        openapi: {
            openapi: '3.0.0',
            info: {
                title: 'IoT CRM API',
                description: `
Enterprise CRM REST API for IoT Dashboard with:

## Core Features
- **Multi-Tenancy** - Complete data isolation between tenants
- **RBAC** - Role-based access control (SysAdmin, Tenant Admin, Tenant User, Customer User)
- **Customer Management** - Companies and contacts
- **Device Ownership** - Link ThingsBoard devices to customers

## Business Modules
- **Vendor Management** - Track suppliers and manufacturers
- **Item Catalog** - Product and inventory management
- **Contract Management** - Agreements with SLA tracking
- **Deal Pipeline** - Sales opportunity tracking

## Integration & Support
- **Service Tickets** - Support ticket management
- **Feedback System** - Bug reports and feature requests
- **AI Chat** - OpenAI-powered assistant with WebSocket streaming
- **Real-time Notifications** - WebSocket push notifications

## Subscription & Billing
- **Stripe Integration** - Subscription management
- **Usage Tracking** - Monitor resource usage against plan limits
        `.trim(),
                version: '2.0.0',
                contact: {
                    name: 'IoT Dashboard Team',
                },
            },
            servers: [
                {
                    url: 'http://localhost:5001',
                    description: 'Development server',
                },
            ],
            tags: [
                { name: 'Health', description: 'Health check endpoints' },
                { name: 'Auth', description: 'Authentication and authorization' },
                { name: 'Tenants', description: 'Tenant management (SysAdmin only)' },
                { name: 'Users', description: 'User management' },
                { name: 'Contacts', description: 'Customer contact management' },
                { name: 'Companies', description: 'Company/organization management' },
                { name: 'Vendors', description: 'Vendor/supplier management' },
                { name: 'Items', description: 'Product/item catalog' },
                { name: 'Contracts', description: 'Contract management' },
                { name: 'Deals', description: 'Sales pipeline and deal management' },
                { name: 'Activities', description: 'Activity logging (calls, emails, meetings, etc.)' },
                { name: 'Device Assignments', description: 'Link ThingsBoard devices to CRM companies' },
                { name: 'Service Tickets', description: 'Support ticket management for devices' },
                { name: 'Billing', description: 'Subscription and billing management' },
                { name: 'Notifications', description: 'User notifications' },
                { name: 'Feedback', description: 'User feedback and feature requests' },
                { name: 'Chat', description: 'AI assistant chat session history' },
                { name: 'Messaging', description: 'Direct messaging between users/tenants and SysAdmin' },
                { name: 'Support', description: 'Simplified support chat for tenant users to contact administrators' },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
                schemas: {
                    PaginatedResponse: {
                        type: 'object',
                        properties: {
                            data: { type: 'array', items: {} },
                            total: { type: 'integer' },
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            totalPages: { type: 'integer' },
                        },
                    },
                    Error: {
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                            message: { type: 'string' },
                        },
                    },
                    Tenant: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            slug: { type: 'string' },
                            domain: { type: 'string', nullable: true },
                            logo: { type: 'string', nullable: true },
                            primaryColor: { type: 'string', nullable: true },
                            status: { type: 'string', enum: ['pending', 'active', 'suspended', 'cancelled'] },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    User: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            email: { type: 'string', format: 'email' },
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            phone: { type: 'string', nullable: true },
                            avatar: { type: 'string', nullable: true },
                            role: { type: 'string', enum: ['sys_admin', 'tenant_admin', 'tenant_user', 'customer_user'] },
                            status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'pending_verification'] },
                            tenantId: { type: 'string', format: 'uuid', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Company: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            industry: { type: 'string', nullable: true },
                            website: { type: 'string', nullable: true },
                            address: { type: 'string', nullable: true },
                            phone: { type: 'string', nullable: true },
                            size: { type: 'string', enum: ['small', 'medium', 'large', 'enterprise'], nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Vendor: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            code: { type: 'string' },
                            type: { type: 'string', enum: ['supplier', 'manufacturer', 'distributor', 'service_provider', 'partner'] },
                            email: { type: 'string', format: 'email', nullable: true },
                            phone: { type: 'string', nullable: true },
                            status: { type: 'string', enum: ['pending', 'active', 'inactive', 'blacklisted'] },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Item: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            sku: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string', nullable: true },
                            category: { type: 'string', nullable: true },
                            unitPrice: { type: 'number', nullable: true },
                            status: { type: 'string', enum: ['draft', 'active', 'discontinued', 'archived'] },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Contract: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            contractNumber: { type: 'string' },
                            title: { type: 'string' },
                            type: { type: 'string', enum: ['purchase', 'sales', 'service', 'maintenance', 'subscription', 'nda', 'partnership'] },
                            startDate: { type: 'string', format: 'date-time' },
                            endDate: { type: 'string', format: 'date-time', nullable: true },
                            totalValue: { type: 'number', nullable: true },
                            status: { type: 'string', enum: ['draft', 'pending_approval', 'approved', 'active', 'expired', 'cancelled', 'terminated'] },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Plan: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            code: { type: 'string' },
                            description: { type: 'string', nullable: true },
                            monthlyPrice: { type: 'number' },
                            yearlyPrice: { type: 'number' },
                            maxUsers: { type: 'integer', nullable: true },
                            maxDevices: { type: 'integer', nullable: true },
                            features: { type: 'array', items: { type: 'string' } },
                        },
                    },
                    Subscription: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            planId: { type: 'string', format: 'uuid' },
                            billingCycle: { type: 'string', enum: ['monthly', 'yearly'] },
                            status: { type: 'string', enum: ['trialing', 'active', 'past_due', 'cancelled', 'unpaid', 'paused'] },
                            startDate: { type: 'string', format: 'date-time' },
                            currentPeriodEnd: { type: 'string', format: 'date-time', nullable: true },
                        },
                    },
                    Notification: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            type: { type: 'string', enum: ['info', 'success', 'warning', 'error', 'alert', 'system'] },
                            title: { type: 'string' },
                            message: { type: 'string' },
                            read: { type: 'boolean' },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Contact: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                            phone: { type: 'string', nullable: true },
                            position: { type: 'string', nullable: true },
                            notes: { type: 'string', nullable: true },
                            companyId: { type: 'string', format: 'uuid', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Deal: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            title: { type: 'string' },
                            value: { type: 'number' },
                            currency: { type: 'string', default: 'USD' },
                            stage: { type: 'string', enum: ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] },
                            probability: { type: 'number', nullable: true },
                            expectedCloseDate: { type: 'string', format: 'date-time', nullable: true },
                            notes: { type: 'string', nullable: true },
                            contactId: { type: 'string', format: 'uuid', nullable: true },
                            companyId: { type: 'string', format: 'uuid', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Activity: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            type: { type: 'string', enum: ['call', 'email', 'meeting', 'note', 'task'] },
                            subject: { type: 'string' },
                            description: { type: 'string', nullable: true },
                            dueDate: { type: 'string', format: 'date-time', nullable: true },
                            completed: { type: 'boolean', default: false },
                            contactId: { type: 'string', format: 'uuid', nullable: true },
                            dealId: { type: 'string', format: 'uuid', nullable: true },
                            companyId: { type: 'string', format: 'uuid', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    DeviceAssignment: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            thingsboardDeviceId: { type: 'string', format: 'uuid', description: 'ThingsBoard device UUID' },
                            deviceName: { type: 'string' },
                            deviceType: { type: 'string', nullable: true },
                            companyId: { type: 'string', format: 'uuid' },
                            notes: { type: 'string', nullable: true },
                            assignedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    ServiceTicket: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            ticketNumber: { type: 'string' },
                            title: { type: 'string' },
                            description: { type: 'string', nullable: true },
                            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                            status: { type: 'string', enum: ['open', 'in_progress', 'waiting_on_customer', 'waiting_on_vendor', 'resolved', 'closed'] },
                            category: { type: 'string', nullable: true },
                            resolution: { type: 'string', nullable: true },
                            deviceAssignmentId: { type: 'string', format: 'uuid', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                            resolvedAt: { type: 'string', format: 'date-time', nullable: true },
                        },
                    },
                    Feedback: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            type: { type: 'string', enum: ['bug', 'feature_request', 'question', 'general'] },
                            subject: { type: 'string' },
                            message: { type: 'string' },
                            userEmail: { type: 'string', format: 'email', nullable: true },
                            status: { type: 'string', enum: ['new', 'in_review', 'planned', 'completed', 'declined'] },
                            response: { type: 'string', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    ChatSession: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            userEmail: { type: 'string', format: 'email', nullable: true },
                            title: { type: 'string', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    ChatMessage: {
                        type: 'object',
                        properties: {
                            id: { type: 'string', format: 'uuid' },
                            sessionId: { type: 'string', format: 'uuid' },
                            role: { type: 'string', enum: ['user', 'assistant'] },
                            content: { type: 'string' },
                            metadata: { type: 'object', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
        },
    });
    await fastify.register(swaggerUi, {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: true,
        },
        staticCSP: true,
    });
    // Auth Routes (no prefix)
    await fastify.register(authRoutes, { prefix: '/api' });
    await fastify.register(otpRoutes, { prefix: '/api' });
    // Enterprise Routes
    await fastify.register(tenantRoutes, { prefix: '/api' });
    await fastify.register(userRoutes, { prefix: '/api' });
    await fastify.register(vendorRoutes, { prefix: '/api' });
    await fastify.register(itemRoutes, { prefix: '/api' });
    await fastify.register(contractRoutes, { prefix: '/api' });
    await fastify.register(billingRoutes, { prefix: '/api' });
    await fastify.register(notificationRoutes, { prefix: '/api' });
    // CRM Core Routes
    await fastify.register(contactRoutes, { prefix: '/api' });
    await fastify.register(companyRoutes, { prefix: '/api' });
    await fastify.register(dealRoutes, { prefix: '/api' });
    await fastify.register(activityRoutes, { prefix: '/api' });
    await fastify.register(emailRoutes, { prefix: '/api' });
    // ThingsBoard Integration Routes
    await fastify.register(deviceAssignmentRoutes, { prefix: '/api' });
    await fastify.register(serviceTicketRoutes, { prefix: '/api' });
    // Feedback & AI Routes
    await fastify.register(feedbackRoutes, { prefix: '/api' });
    await fastify.register(chatRoutes, { prefix: '/api' });
    // Direct Messaging Routes
    await fastify.register(messagingRoutes, { prefix: '/api' });
    // Audit Logs Routes
    await fastify.register(auditLogRoutes, { prefix: '/api' });
    // Support Chat Routes (simplified support for tenant users)
    await fastify.register(supportRoutes, { prefix: '/api' });
    // Webhook Routes (Resend inbound emails, delivery status)
    await fastify.register(webhookRoutes, { prefix: '/api' });
    // Contact Form (public, no auth)
    await fastify.register(contactFormRoutes, { prefix: '/api' });
    // Health check
    fastify.get('/health', {
        schema: {
            tags: ['Health'],
            summary: 'Server health check',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    }, async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
    // Database health check
    fastify.get('/health/db', {
        schema: {
            tags: ['Health'],
            summary: 'Database connection health check',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        database: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                    },
                },
                503: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        database: { type: 'string' },
                        message: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    }, async (request, reply) => {
        try {
            await prisma.$queryRaw `SELECT 1`;
            return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
        }
        catch (error) {
            return reply.status(503).send({
                status: 'error',
                database: 'disconnected',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            });
        }
    });
    // Start server
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    try {
        await fastify.listen({ port, host });
        console.log(`CRM API server running at http://localhost:${port}`);
        console.log(`API documentation available at http://localhost:${port}/docs`);
        console.log(`WebSocket available at ws://localhost:${port}/ws`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down...');
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
});
bootstrap();
//# sourceMappingURL=index.js.map
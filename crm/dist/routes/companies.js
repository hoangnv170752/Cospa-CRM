import { prisma } from '../services/prisma.js';
import { authenticate, withTenantScope, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
export async function companyRoutes(fastify) {
    // GET /companies
    fastify.get('/companies', {
        preHandler: [authenticate],
        schema: {
            tags: ['Companies'],
            summary: 'List all companies',
            description: 'Get a paginated list of companies with optional search filter',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'integer', default: 1, description: 'Page number' },
                    limit: { type: 'integer', default: 20, description: 'Items per page' },
                    search: { type: 'string', description: 'Search by name or industry' },
                },
            },
        },
    }, async (request, reply) => {
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 20;
        const { search } = request.query;
        const skip = (page - 1) * limit;
        const searchFilter = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { industry: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {};
        const where = withTenantScope(request, searchFilter);
        const [data, total] = await Promise.all([
            prisma.company.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.company.count({ where }),
        ]);
        return reply.send({
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    });
    // GET /companies/:id
    fastify.get('/companies/:id', {
        preHandler: [authenticate],
        schema: {
            tags: ['Companies'],
            summary: 'Get company by ID',
            description: 'Get a single company with all related data (contacts, deals, device assignments)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', description: 'Company ID' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        const where = withTenantScope(request, { id: request.params.id });
        const company = await prisma.company.findFirst({
            where,
            include: {
                contacts: true,
                deals: true,
                deviceAssignments: true,
                assetAssignments: true,
            },
        });
        if (!company) {
            return reply.status(404).send({ error: 'Company not found' });
        }
        return reply.send(company);
    });
    // POST /companies
    fastify.post('/companies', {
        preHandler: [authenticate, requireRole('tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Companies'],
            summary: 'Create a new company',
            description: 'Create a new company record',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', description: 'Company name' },
                    industry: { type: 'string', description: 'Industry sector' },
                    website: { type: 'string', description: 'Company website URL' },
                    address: { type: 'string', description: 'Physical address' },
                    phone: { type: 'string', description: 'Contact phone number' },
                    size: { type: 'string', enum: ['small', 'medium', 'large', 'enterprise'], description: 'Company size' },
                },
            },
        },
    }, async (request, reply) => {
        const { name, industry, website, address, phone, size } = request.body;
        if (!name) {
            return reply.status(400).send({ error: 'name is required' });
        }
        if (!request.user?.tenantId) {
            return reply.status(400).send({ error: 'Tenant context required' });
        }
        const company = await prisma.company.create({
            data: {
                name,
                industry,
                website,
                address,
                phone,
                size,
                tenantId: request.user.tenantId,
            },
        });
        // Audit log
        createAuditLog(request, {
            action: 'create',
            resource: 'company',
            resourceId: company.id,
            newValues: { name, industry, website, address, phone, size },
        }).catch((err) => console.error('Audit log error:', err));
        return reply.status(201).send(company);
    });
    // PUT /companies/:id
    fastify.put('/companies/:id', {
        preHandler: [authenticate, requireRole('tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Companies'],
            summary: 'Update a company',
            description: 'Update an existing company record',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', description: 'Company ID' },
                },
                required: ['id'],
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', description: 'Company name' },
                    industry: { type: 'string', description: 'Industry sector' },
                    website: { type: 'string', description: 'Company website URL' },
                    address: { type: 'string', description: 'Physical address' },
                    phone: { type: 'string', description: 'Contact phone number' },
                    size: { type: 'string', enum: ['small', 'medium', 'large', 'enterprise'], description: 'Company size' },
                },
            },
        },
    }, async (request, reply) => {
        const where = withTenantScope(request, { id: request.params.id });
        const existing = await prisma.company.findFirst({ where });
        if (!existing) {
            return reply.status(404).send({ error: 'Company not found' });
        }
        const updated = await prisma.company.update({
            where: { id: request.params.id },
            data: request.body,
        });
        // Audit log
        createAuditLog(request, {
            action: 'update',
            resource: 'company',
            resourceId: updated.id,
            oldValues: { name: existing.name, industry: existing.industry, phone: existing.phone },
            newValues: request.body,
        }).catch((err) => console.error('Audit log error:', err));
        return reply.send(updated);
    });
    // DELETE /companies/:id
    fastify.delete('/companies/:id', {
        preHandler: [authenticate, requireRole('tenant_admin')],
        schema: {
            tags: ['Companies'],
            summary: 'Delete a company',
            description: 'Delete a company record',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', description: 'Company ID' },
                },
                required: ['id'],
            },
        },
    }, async (request, reply) => {
        const where = withTenantScope(request, { id: request.params.id });
        const existing = await prisma.company.findFirst({ where });
        if (!existing) {
            return reply.status(404).send({ error: 'Company not found' });
        }
        try {
            await prisma.company.delete({
                where: { id: request.params.id },
            });
            // Audit log
            createAuditLog(request, {
                action: 'delete',
                resource: 'company',
                resourceId: request.params.id,
                oldValues: { name: existing.name, industry: existing.industry },
            }).catch((err) => console.error('Audit log error:', err));
            return reply.status(204).send();
        }
        catch {
            return reply.status(404).send({ error: 'Company not found' });
        }
    });
}
//# sourceMappingURL=companies.js.map
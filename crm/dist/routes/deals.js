import { prisma } from '../services/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
export async function dealRoutes(fastify) {
    // GET /deals
    fastify.get('/deals', {
        preHandler: [authenticate],
        schema: {
            tags: ['Deals'],
            summary: 'List deals',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 20;
        const { search, stage } = request.query;
        const skip = (page - 1) * limit;
        const baseFilter = {};
        if (stage) {
            baseFilter.stage = stage;
        }
        if (search) {
            baseFilter.title = { contains: search, mode: 'insensitive' };
        }
        // Deals are scoped through company's tenantId
        const tenantFilter = request.user?.tenantId
            ? { company: { tenantId: request.user.tenantId } }
            : {};
        const where = { ...baseFilter, ...tenantFilter };
        const [data, total] = await Promise.all([
            prisma.deal.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    contact: true,
                    company: true,
                },
            }),
            prisma.deal.count({ where }),
        ]);
        return reply.send({
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    });
    // GET /deals/:id
    fastify.get('/deals/:id', {
        preHandler: [authenticate],
        schema: {
            tags: ['Deals'],
            summary: 'Get deal by ID',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const tenantFilter = request.user?.tenantId
            ? { company: { tenantId: request.user.tenantId } }
            : {};
        const deal = await prisma.deal.findFirst({
            where: { id: request.params.id, ...tenantFilter },
            include: {
                contact: true,
                company: true,
                activities: true,
            },
        });
        if (!deal) {
            return reply.status(404).send({ error: 'Deal not found' });
        }
        return reply.send(deal);
    });
    // POST /deals
    fastify.post('/deals', {
        preHandler: [authenticate, requireRole('tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Deals'],
            summary: 'Create deal',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const { title, value, currency = 'USD', stage = 'lead', contactId, companyId, probability, expectedCloseDate, notes, } = request.body;
        if (!title || value === undefined) {
            return reply
                .status(400)
                .send({ error: 'title and value are required' });
        }
        // Verify company belongs to tenant
        if (companyId && request.user?.tenantId) {
            const company = await prisma.company.findFirst({
                where: { id: companyId, tenantId: request.user.tenantId },
            });
            if (!company) {
                return reply.status(400).send({ error: 'Invalid company' });
            }
        }
        const deal = await prisma.deal.create({
            data: {
                title,
                value,
                currency,
                stage: stage,
                contactId,
                companyId,
                probability,
                expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
                notes,
            },
            include: {
                contact: true,
                company: true,
            },
        });
        // Audit log
        createAuditLog(request, {
            action: 'create',
            resource: 'deal',
            resourceId: deal.id,
            newValues: { title, value, currency, stage, companyId },
        }).catch((err) => console.error('Audit log error:', err));
        return reply.status(201).send(deal);
    });
    // PUT /deals/:id
    fastify.put('/deals/:id', {
        preHandler: [authenticate, requireRole('tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Deals'],
            summary: 'Update deal',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const tenantFilter = request.user?.tenantId
            ? { company: { tenantId: request.user.tenantId } }
            : {};
        const existing = await prisma.deal.findFirst({
            where: { id: request.params.id, ...tenantFilter },
        });
        if (!existing) {
            return reply.status(404).send({ error: 'Deal not found' });
        }
        const { expectedCloseDate, ...rest } = request.body;
        const updated = await prisma.deal.update({
            where: { id: request.params.id },
            data: {
                ...rest,
                ...(expectedCloseDate && { expectedCloseDate: new Date(expectedCloseDate) }),
            },
            include: {
                contact: true,
                company: true,
            },
        });
        // Audit log
        createAuditLog(request, {
            action: 'update',
            resource: 'deal',
            resourceId: updated.id,
            oldValues: { title: existing.title, value: existing.value, stage: existing.stage },
            newValues: request.body,
        }).catch((err) => console.error('Audit log error:', err));
        return reply.send(updated);
    });
    // DELETE /deals/:id
    fastify.delete('/deals/:id', {
        preHandler: [authenticate, requireRole('tenant_admin')],
        schema: {
            tags: ['Deals'],
            summary: 'Delete deal',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const tenantFilter = request.user?.tenantId
            ? { company: { tenantId: request.user.tenantId } }
            : {};
        const existing = await prisma.deal.findFirst({
            where: { id: request.params.id, ...tenantFilter },
        });
        if (!existing) {
            return reply.status(404).send({ error: 'Deal not found' });
        }
        try {
            await prisma.deal.delete({
                where: { id: request.params.id },
            });
            // Audit log
            createAuditLog(request, {
                action: 'delete',
                resource: 'deal',
                resourceId: request.params.id,
                oldValues: { title: existing.title, value: existing.value, stage: existing.stage },
            }).catch((err) => console.error('Audit log error:', err));
            return reply.status(204).send();
        }
        catch {
            return reply.status(404).send({ error: 'Deal not found' });
        }
    });
}
//# sourceMappingURL=deals.js.map
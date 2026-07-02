import { prisma } from '../services/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.js';
export async function contactRoutes(fastify) {
    // GET /contacts
    fastify.get('/contacts', {
        preHandler: [authenticate],
        schema: {
            tags: ['Contacts'],
            summary: 'List contacts',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const page = Number(request.query.page) || 1;
        const limit = Number(request.query.limit) || 20;
        const { search } = request.query;
        const skip = (page - 1) * limit;
        const searchFilter = search
            ? {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {};
        // Contacts are scoped through their company's tenantId
        const tenantFilter = request.user?.tenantId
            ? { company: { tenantId: request.user.tenantId } }
            : {};
        const where = { ...searchFilter, ...tenantFilter };
        const [data, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { company: true },
            }),
            prisma.contact.count({ where }),
        ]);
        return reply.send({
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    });
    // GET /contacts/:id
    fastify.get('/contacts/:id', {
        preHandler: [authenticate],
        schema: {
            tags: ['Contacts'],
            summary: 'Get contact by ID',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const tenantFilter = request.user?.tenantId
            ? { company: { tenantId: request.user.tenantId } }
            : {};
        const contact = await prisma.contact.findFirst({
            where: { id: request.params.id, ...tenantFilter },
            include: {
                company: true,
                deals: true,
                activities: true,
            },
        });
        if (!contact) {
            return reply.status(404).send({ error: 'Contact not found' });
        }
        return reply.send(contact);
    });
    // POST /contacts
    fastify.post('/contacts', {
        preHandler: [authenticate, requireRole('tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Contacts'],
            summary: 'Create contact',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const { firstName, lastName, email, phone, companyId, position, notes } = request.body;
        if (!firstName || !lastName || !email) {
            return reply
                .status(400)
                .send({ error: 'firstName, lastName, and email are required' });
        }
        // Verify company belongs to tenant if companyId provided
        if (companyId && request.user?.tenantId) {
            const company = await prisma.company.findFirst({
                where: { id: companyId, tenantId: request.user.tenantId },
            });
            if (!company) {
                return reply.status(400).send({ error: 'Invalid company' });
            }
        }
        const contact = await prisma.contact.create({
            data: {
                firstName,
                lastName,
                email,
                phone,
                companyId,
                position,
                notes,
            },
            include: { company: true },
        });
        // Audit log
        createAuditLog(request, {
            action: 'create',
            resource: 'contact',
            resourceId: contact.id,
            newValues: { firstName, lastName, email, phone, companyId, position },
        }).catch((err) => console.error('Audit log error:', err));
        return reply.status(201).send(contact);
    });
    // PUT /contacts/:id
    fastify.put('/contacts/:id', {
        preHandler: [authenticate, requireRole('tenant_admin', 'tenant_user')],
        schema: {
            tags: ['Contacts'],
            summary: 'Update contact',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const tenantFilter = request.user?.tenantId
            ? { company: { tenantId: request.user.tenantId } }
            : {};
        const existing = await prisma.contact.findFirst({
            where: { id: request.params.id, ...tenantFilter },
        });
        if (!existing) {
            return reply.status(404).send({ error: 'Contact not found' });
        }
        const updated = await prisma.contact.update({
            where: { id: request.params.id },
            data: request.body,
            include: { company: true },
        });
        // Audit log
        createAuditLog(request, {
            action: 'update',
            resource: 'contact',
            resourceId: updated.id,
            oldValues: {
                firstName: existing.firstName,
                lastName: existing.lastName,
                email: existing.email,
                phone: existing.phone,
            },
            newValues: request.body,
        }).catch((err) => console.error('Audit log error:', err));
        return reply.send(updated);
    });
    // DELETE /contacts/:id
    fastify.delete('/contacts/:id', {
        preHandler: [authenticate, requireRole('tenant_admin')],
        schema: {
            tags: ['Contacts'],
            summary: 'Delete contact',
            security: [{ bearerAuth: [] }],
        },
    }, async (request, reply) => {
        const tenantFilter = request.user?.tenantId
            ? { company: { tenantId: request.user.tenantId } }
            : {};
        const existing = await prisma.contact.findFirst({
            where: { id: request.params.id, ...tenantFilter },
        });
        if (!existing) {
            return reply.status(404).send({ error: 'Contact not found' });
        }
        try {
            await prisma.contact.delete({
                where: { id: request.params.id },
            });
            // Audit log
            createAuditLog(request, {
                action: 'delete',
                resource: 'contact',
                resourceId: request.params.id,
                oldValues: {
                    firstName: existing.firstName,
                    lastName: existing.lastName,
                    email: existing.email,
                },
            }).catch((err) => console.error('Audit log error:', err));
            return reply.status(204).send();
        }
        catch {
            return reply.status(404).send({ error: 'Contact not found' });
        }
    });
}
//# sourceMappingURL=contacts.js.map
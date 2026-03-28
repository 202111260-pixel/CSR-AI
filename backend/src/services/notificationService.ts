import { prisma } from '../config/database.js';

export const notificationService = {
  async create(userId: string, title: string, message: string, type = 'info', link?: string) {
    return prisma.notification.create({
      data: { userId, title, message, type, link },
    });
  },

  async createForRole(role: string, title: string, message: string, type = 'info', link?: string) {
    const users = await prisma.user.findMany({
      where: { role: role as any, status: 'active' },
      select: { id: true },
    });
    if (users.length === 0) return [];
    return prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, title, message, type, link })),
    });
  },

  async createForAll(title: string, message: string, type = 'info', link?: string) {
    const users = await prisma.user.findMany({
      where: { status: 'active' },
      select: { id: true },
    });
    if (users.length === 0) return [];
    return prisma.notification.createMany({
      data: users.map(u => ({ userId: u.id, title, message, type, link })),
    });
  },
};

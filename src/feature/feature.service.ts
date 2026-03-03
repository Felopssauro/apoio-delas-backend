import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const COMMENT_INCLUDE = {
  author: { select: { id: true, name: true, suspended: true } },
  reports: { select: { id: true } },
};

@Injectable()
export class FeatureService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── POSTS ───────────────────────────────────────────────

  async sendStory(title: string, story: string, userId: number, anonymous: boolean) {
    const post = await (this.prisma as any).post.create({
      data: { title, content: story, published: false, anonymous, authorId: userId },
    });
    return { message: 'Relato enviado com sucesso! Aguarde a aprovação.', post };
  }

  async getMyStories(userId: number) {
    return (this.prisma as any).post.findMany({
      where: { authorId: userId },
      include: {
        comments: {
          where: { parentId: null },
          orderBy: { id: 'asc' },
          include: {
            ...COMMENT_INCLUDE,
            replies: {
              orderBy: { id: 'asc' },
              include: COMMENT_INCLUDE,
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }

  async getStories() {
    return (this.prisma as any).post.findMany({
      where: { published: true },
      include: {
        author: { select: { name: true } },
        comments: { select: { id: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async getStoryById(postId: number) {
    // findUnique só aceita campos únicos no where — published não pode entrar aqui
    const post = await (this.prisma as any).post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { name: true } },
        comments: {
          where: { parentId: null },
          orderBy: { id: 'asc' },
          include: {
            ...COMMENT_INCLUDE,
            replies: {
              orderBy: { id: 'asc' },
              include: COMMENT_INCLUDE,
            },
          },
        },
      },
    });

    if (!post || !post.published) throw new NotFoundException('Relato não encontrado.');
    return post;
  }

  async updateStory(postId: number, userId: number, title: string, content: string) {
    const post = await (this.prisma as any).post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Relato não encontrado.');
    if (post.authorId !== userId) throw new ForbiddenException('Sem permissão.');
    return (this.prisma as any).post.update({
      where: { id: postId },
      data: { title, content, published: false },
    });
  }

  async deleteStory(postId: number, userId: number) {
    const post = await (this.prisma as any).post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Relato não encontrado.');
    if (post.authorId !== userId) throw new ForbiddenException('Sem permissão.');
    const comments = await (this.prisma as any).comment.findMany({ where: { postId }, select: { id: true } });
    const commentIds = comments.map((c: any) => c.id);
    if (commentIds.length > 0) {
      await (this.prisma as any).report.deleteMany({ where: { commentId: { in: commentIds } } });
      await (this.prisma as any).comment.deleteMany({ where: { postId } });
    }
    return (this.prisma as any).post.delete({ where: { id: postId } });
  }

  // ─── COMMENTS ────────────────────────────────────────────

  async addComment(postId: number, userId: number, text: string, anonymous: boolean, parentId?: number) {
    const user = await (this.prisma as any).userWebsite.findUnique({ where: { id: userId } });
    if (user?.suspended) throw new ForbiddenException('Sua conta está suspensa.');

    const post = await (this.prisma as any).post.findUnique({ where: { id: postId } });
    if (!post || !post.published) throw new NotFoundException('Relato não encontrado ou não publicado.');

    if (parentId) {
      const parent = await (this.prisma as any).comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.postId !== postId) throw new NotFoundException('Comentário pai não encontrado.');
    }

    return (this.prisma as any).comment.create({
      data: { text, anonymous, authorId: userId, postId, parentId: parentId ?? null },
      include: {
        author: { select: { id: true, name: true } },
        replies: true,
        reports: { select: { id: true } },
      },
    });
  }

  // ─── REPORTS ─────────────────────────────────────────────

  async reportComment(commentId: number, reporterId: number, reason: string, detail?: string) {
    const comment = await (this.prisma as any).comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comentário não encontrado.');

    const existing = await (this.prisma as any).report.findFirst({
      where: { commentId, reporterId, status: 'pendente' },
    });
    if (existing) return { message: 'Você já denunciou este comentário.' };

    return (this.prisma as any).report.create({
      data: { commentId, reporterId, reason, detail: detail ?? null },
    });
  }

  // ─── ADMIN ───────────────────────────────────────────────

  async getPendingStories() {
    return (this.prisma as any).post.findMany({
      where: { published: false },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { id: 'desc' },
    });
  }

  async reviewStory(postId: number, approve: boolean) {
    if (approve) {
      return (this.prisma as any).post.update({ where: { id: postId }, data: { published: true } });
    } else {
      const comments = await (this.prisma as any).comment.findMany({ where: { postId }, select: { id: true } });
      const ids = comments.map((c: any) => c.id);
      if (ids.length > 0) {
        await (this.prisma as any).report.deleteMany({ where: { commentId: { in: ids } } });
        await (this.prisma as any).comment.deleteMany({ where: { postId } });
      }
      return (this.prisma as any).post.delete({ where: { id: postId } });
    }
  }

  async getApprovedStoriesHistory() {
    return (this.prisma as any).post.findMany({
      where: { published: true },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { id: 'desc' },
      take: 50,
    });
  }

  async getPendingReports() {
    return (this.prisma as any).report.findMany({
      where: { status: 'pendente' },
      include: {
        comment: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            post: { select: { id: true, title: true } },
          },
        },
        reporter: { select: { name: true, email: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async resolveReport(reportId: number, action: 'suspender' | 'banir' | 'ignorar') {
    const report = await (this.prisma as any).report.findUnique({
      where: { id: reportId },
      include: { comment: { select: { authorId: true } } },
    });
    if (!report) throw new NotFoundException('Denúncia não encontrada.');

    if (action === 'suspender' && report.comment.authorId) {
      await (this.prisma as any).userWebsite.update({
        where: { id: report.comment.authorId },
        data: { suspended: true },
      });
    }

    if (action === 'banir' && report.comment.authorId) {
      const userComments = await (this.prisma as any).comment.findMany({
        where: { authorId: report.comment.authorId },
        select: { id: true },
      });
      const userCommentIds = userComments.map((c: any) => c.id);
      if (userCommentIds.length > 0) {
        await (this.prisma as any).report.deleteMany({ where: { commentId: { in: userCommentIds } } });
        await (this.prisma as any).comment.deleteMany({ where: { authorId: report.comment.authorId } });
      }
      await (this.prisma as any).userWebsite.update({
        where: { id: report.comment.authorId },
        data: { suspended: true },
      });
    }

    return (this.prisma as any).report.update({
      where: { id: reportId },
      data: { status: action === 'ignorar' ? 'ignorado' : 'resolvido' },
    });
  }
}
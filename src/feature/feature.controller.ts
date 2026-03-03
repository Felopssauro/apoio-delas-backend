import {
  Request, Body, Controller, Post, Get, Patch, Delete,
  UseGuards, Param, ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureService } from './feature.service';

@Controller('feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  // ─── POSTS ───────────────────────────────────────────────

  @Post('send-story')
  @UseGuards(JwtAuthGuard)
  postStory(@Body() body: { title: string; story: string; anonymous?: boolean }, @Request() req) {
    return this.featureService.sendStory(body.title, body.story, req.user.userId, body.anonymous ?? false);
  }

  @Get('my-stories')
  @UseGuards(JwtAuthGuard)
  getMyStories(@Request() req) {
    return this.featureService.getMyStories(req.user.userId);
  }

  @Patch('my-stories/:id')
  @UseGuards(JwtAuthGuard)
  updateStory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title: string; content: string },
    @Request() req,
  ) {
    return this.featureService.updateStory(id, req.user.userId, body.title, body.content);
  }

  @Delete('my-stories/:id')
  @UseGuards(JwtAuthGuard)
  deleteStory(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.featureService.deleteStory(id, req.user.userId);
  }

  @Get('stories')
  getStories() {
    return this.featureService.getStories();
  }

  @Get('stories/:id')
  getStoryById(@Param('id', ParseIntPipe) id: number) {
    return this.featureService.getStoryById(id);
  }

  // ─── COMMENTS ────────────────────────────────────────────

  // Comentário raiz
  @Post('stories/:id/comment')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('id', ParseIntPipe) postId: number,
    @Body() body: { text: string; anonymous?: boolean },
    @Request() req,
  ) {
    return this.featureService.addComment(postId, req.user.userId, body.text, body.anonymous ?? false);
  }

  // Reply a um comentário
  @Post('stories/:id/comment/:parentId/reply')
  @UseGuards(JwtAuthGuard)
  replyComment(
    @Param('id', ParseIntPipe) postId: number,
    @Param('parentId', ParseIntPipe) parentId: number,
    @Body() body: { text: string; anonymous?: boolean },
    @Request() req,
  ) {
    return this.featureService.addComment(postId, req.user.userId, body.text, body.anonymous ?? false, parentId);
  }

  // ─── REPORTS ─────────────────────────────────────────────

  @Post('comments/:id/report')
  @UseGuards(JwtAuthGuard)
  reportComment(
    @Param('id', ParseIntPipe) commentId: number,
    @Body() body: { reason: string; detail?: string },
    @Request() req,
  ) {
    return this.featureService.reportComment(commentId, req.user.userId, body.reason, body.detail);
  }

  // ─── ADMIN ───────────────────────────────────────────────

  @Get('admin/pending-stories')
  @UseGuards(JwtAuthGuard)
  getPendingStories() {
    return this.featureService.getPendingStories();
  }

  @Patch('admin/stories/:id')
  @UseGuards(JwtAuthGuard)
  reviewStory(@Param('id', ParseIntPipe) id: number, @Body() body: { approve: boolean }) {
    return this.featureService.reviewStory(id, body.approve);
  }

  @Get('admin/history')
  @UseGuards(JwtAuthGuard)
  getHistory() {
    return this.featureService.getApprovedStoriesHistory();
  }

  @Get('admin/reports')
  @UseGuards(JwtAuthGuard)
  getPendingReports() {
    return this.featureService.getPendingReports();
  }

  @Patch('admin/reports/:id')
  @UseGuards(JwtAuthGuard)
  resolveReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: 'suspender' | 'banir' | 'ignorar' },
  ) {
    return this.featureService.resolveReport(id, body.action);
  }
}
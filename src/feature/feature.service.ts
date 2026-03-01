import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureService {
  async sendStory(story: string, userId: number) {
    return {
      message: 'História enviada com sucesso',
      story,
      authorId: userId,
    };
  }
}
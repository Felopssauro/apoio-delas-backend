import { Request, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureService } from './feature.service'
import { SendStoryDto } from './dto/send-story.dto';


@Controller('feature')
export class FeatureController {
    constructor(private readonly featureService: FeatureService) {}

    @Post('send-story')
    @UseGuards(JwtAuthGuard)
    postStory(@Body() dto:SendStoryDto, @Request() req) {
        return this.featureService.sendStory(dto.story, req.user.userId);
    }
    }

import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MoviesService } from './movies.service';

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('trending')
  async getTrending(@Query('page') page?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const items = await this.moviesService.getTrending(pageNum);
    return { success: true, items };
  }

  @Get('search')
  async search(@Query('q') query: string) {
    const items = await this.moviesService.search(query || '');
    return { success: true, items };
  }

  @Get('sources')
  async getSources(
    @Query('title') title: string,
    @Query('tmdbId') tmdbId?: string,
    @Query('mediaType') mediaType?: 'movie' | 'tv',
    @Query('season') season?: string,
    @Query('episode') episode?: string,
  ) {
    const result = await this.moviesService.getStreamSources(
      title,
      tmdbId,
      mediaType || 'movie',
      season ? parseInt(season, 10) : 1,
      episode ? parseInt(episode, 10) : 1,
    );
    return { success: true, data: result };
  }

  @Get('proxy')
  async proxyStream(
    @Query('url') streamUrl: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.moviesService.proxyHlsStream(streamUrl, req.headers, res);
  }
}

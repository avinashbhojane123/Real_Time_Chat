import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { IgshareService } from './igshare.service';

describe('IgshareService', () => {
  let service: IgshareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IgshareService],
    }).compile();

    service = module.get<IgshareService>(IgshareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractCleanUrl', () => {
    it('should throw BadRequestException if text is missing', () => {
      expect(() => service.extractCleanUrl('')).toThrow(BadRequestException);
    });

    it('should extract Instagram URL from dirty pasted text', () => {
      const dirtyText =
        'Watch reel on Instagram! https://www.instagram.com/reel/C123456789/?igsh=MWQx... View profile';
      const clean = service.extractCleanUrl(dirtyText);
      expect(clean).toContain('https://www.instagram.com/reel/C123456789/');
    });
  });

  describe('resolveMediaView', () => {
    it('should resolve Reel URL correctly', async () => {
      const result = await service.resolveMediaView(
        'https://www.instagram.com/reel/DBabc123/?igsh=test',
      );

      expect(result.success).toBe(true);
      expect(result.type).toBe('instagram');
      expect(result.mediaType).toBe('reel');
      expect(result.shortcode).toBe('DBabc123');
      expect(result.embedUrl).toBe('https://www.instagram.com/p/DBabc123/embed/captioned/');
      expect(result.canViewWithoutAccount).toBe(true);
    });

    it('should resolve Post URL correctly', async () => {
      const result = await service.resolveMediaView(
        'https://www.instagram.com/p/CXYZ999/',
      );

      expect(result.success).toBe(true);
      expect(result.mediaType).toBe('post');
      expect(result.shortcode).toBe('CXYZ999');
    });

    it('should resolve Profile URL correctly', async () => {
      const result = await service.resolveMediaView(
        'https://www.instagram.com/instagram/',
      );

      expect(result.success).toBe(true);
      expect(result.mediaType).toBe('profile');
      expect(result.username).toBe('instagram');
    });

    it('should throw BadRequestException for invalid URLs', async () => {
      await expect(
        service.resolveMediaView('https://example.com/not-instagram'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

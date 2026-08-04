import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InstagramService } from './instagram.service';

describe('InstagramService', () => {
  let service: InstagramService;

  jest.setTimeout(15000);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InstagramService],
    }).compile();

    service = module.get<InstagramService>(InstagramService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractCleanUrl', () => {
    it('should throw BadRequestException if text is missing', () => {
      expect(() => service.extractCleanUrl('')).toThrow(BadRequestException);
    });

    it('should extract Instagram URL from dirty text', () => {
      const text = 'Check out this Reel! https://www.instagram.com/reel/C123456789/?igsh=test1234';
      const clean = service.extractCleanUrl(text);
      expect(clean).toContain('https://www.instagram.com/reel/C123456789/');
    });
  });

  describe('resolveMediaView', () => {
    it('should resolve Reel URL correctly', async () => {
      const result = await service.resolveMediaView('https://www.instagram.com/reel/DBabc123/?igsh=test');
      expect(result.success).toBe(true);
      expect(result.type).toBe('instagram');
      expect(result.mediaType).toBe('reel');
      expect(result.shortcode).toBe('DBabc123');
      expect(result.canViewWithoutAccount).toBe(true);
    });

    it('should resolve Profile URL correctly', async () => {
      const result = await service.resolveMediaView('https://www.instagram.com/instagram/');
      expect(result.success).toBe(true);
      expect(result.mediaType).toBe('profile');
      expect(result.username).toBe('instagram');
    });

    it('should throw BadRequestException for invalid URLs', async () => {
      await expect(service.resolveMediaView('https://example.com/not-instagram')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

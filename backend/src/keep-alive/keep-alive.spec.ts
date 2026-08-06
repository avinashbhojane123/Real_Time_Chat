import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { KeepAliveController } from './keep-alive.controller';
import { KeepAliveService } from './keep-alive.service';

describe('KeepAliveController', () => {
  let controller: KeepAliveController;
  let service: KeepAliveService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeepAliveController],
      providers: [
        KeepAliveService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'RENDER_EXTERNAL_URL') return 'https://test-app.onrender.com';
              if (key === 'KEEP_ALIVE_INTERVAL_MINUTES') return '10';
              if (key === 'DISABLE_KEEP_ALIVE') return 'true';
              return null;
            },
          },
        },
      ],
    }).compile();

    controller = module.get<KeepAliveController>(KeepAliveController);
    service = module.get<KeepAliveService>(KeepAliveService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return ping response structure', () => {
    const response = controller.ping();
    expect(response.statusCode).toBe(200);
    expect(response.status).toBe('ok');
    expect(response.message).toBeDefined();
  });

  it('should construct correct target URL', () => {
    const url = service.getTargetUrl();
    expect(url).toBe('https://test-app.onrender.com/api/keep-alive/ping');
  });
});

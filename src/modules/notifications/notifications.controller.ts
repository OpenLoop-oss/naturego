import { Controller, Get, Post, Param, Query, UseGuards, Res, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('stream')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'SSE stream for real-time notifications' })
  streamNotifications(@Req() req: Request, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const clientId = `${req.user?.id || 'anonymous'}-${Date.now()}`;
    const isAdmin = (req.user as any)?.role === 'ADMIN';

    this.notificationsService.addClient(clientId, isAdmin);

    res.write(
      `data: ${JSON.stringify({ type: 'CONNECTED', clientId, isAdmin, timestamp: new Date() })}\n\n`,
    );

    const keepAlive = setInterval(() => {
      res.write(`: keepalive\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
      this.notificationsService.removeClient(clientId);
    });
  }
}

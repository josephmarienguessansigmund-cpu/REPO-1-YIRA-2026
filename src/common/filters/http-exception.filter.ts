import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();
    const req  = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Log structuré
    const message = exception instanceof HttpException
      ? exception.message
      : 'Erreur serveur interne';

    this.logger.error(
      `[${req.method}] ${req.url} — ${status} — ${message}`,
      exception instanceof Error ? exception.stack : String(exception)
    );

    // Réponse métier claire — jamais de stack en production
    res.status(status).json({
      statusCode: status,
      timestamp:  new Date().toISOString(),
      path:       req.url,
      error:      this.getMessageMetier(status, message),
      success:    false,
    });
  }

  private getMessageMetier(status: number, raw: string): string {
    const messages: Record<number, string> = {
      400: 'Données invalides. Vérifiez les champs envoyés.',
      401: 'Authentification requise. Reconnectez-vous.',
      403: 'Accès refusé. Vérifiez vos permissions.',
      404: 'Ressource introuvable.',
      408: 'Le service IA a mis trop de temps à répondre. Réessayez.',
      422: 'Données non traitables. Vérifiez le format.',
      429: 'Trop de requêtes. Attendez quelques secondes.',
      500: 'Erreur technique temporaire. Notre équipe est informée.',
      503: 'Service temporairement indisponible. Réessayez dans 30 secondes.',
    };
    return messages[status] || raw || 'Erreur inconnue';
  }
}

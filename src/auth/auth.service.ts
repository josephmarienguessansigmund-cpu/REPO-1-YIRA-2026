import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterCabinetDto, LoginDto, JwtPayload } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Inscription d'un nouveau cabinet ────────────────────────────────────────

  async register(dto: RegisterCabinetDto) {
    // Vérifier l'unicité de l'email
    const existant = await this.prisma.yiraCabinet.findUnique({
      where: { email_contact: dto.email_contact },
    });
    if (existant) {
      throw new ConflictException('Un cabinet avec cet email existe déjà.');
    }

    // Hasher le mot de passe
    const password_hash = await bcrypt.hash(dto.password, 12);

    // Créer le cabinet
    // Note : le champ `password_hash` doit être ajouté à YiraCabinet dans schema.prisma
    const cabinet = await this.prisma.yiraCabinet.create({
      data: {
        nom: dto.nom,
        email_contact: dto.email_contact,
        secteur: dto.secteur,
        password_hash,          // ← nouveau champ String dans le schema
      } as any, // cast temporaire jusqu'à la migration Prisma
    });

    this.logger.log(`🏢 Cabinet enregistré : [${cabinet.id}] ${cabinet.nom}`);

    const token = this.signToken(cabinet);
    return this.buildResponse(cabinet, token);
  }

  // ─── Connexion ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const cabinet = await this.prisma.yiraCabinet.findUnique({
      where: { email_contact: dto.email_contact },
    });

    if (!cabinet || !cabinet.actif) {
      throw new UnauthorizedException('Identifiants invalides ou compte inactif.');
    }

    // Vérifier le mot de passe
    const passwordValide = await bcrypt.compare(
      dto.password,
      (cabinet as any).password_hash ?? '',
    );

    if (!passwordValide) {
      throw new UnauthorizedException('Identifiants invalides ou compte inactif.');
    }

    this.logger.log(`🔐 Connexion réussie : [${cabinet.id}] ${cabinet.nom}`);

    const token = this.signToken(cabinet);
    return this.buildResponse(cabinet, token);
  }

  // ─── Helpers privés ──────────────────────────────────────────────────────────

  private signToken(cabinet: { id: string; email_contact: string; nom: string }): string {
    const payload: JwtPayload = {
      sub: cabinet.id,
      email: cabinet.email_contact,
      nom: cabinet.nom,
    };
    return this.jwtService.sign(payload);
  }

  private buildResponse(cabinet: any, token: string) {
    return {
      access_token: token,
      token_type: 'Bearer',
      cabinet: {
        id: cabinet.id,
        nom: cabinet.nom,
        email_contact: cabinet.email_contact,
        secteur: cabinet.secteur,
      },
    };
  }
}

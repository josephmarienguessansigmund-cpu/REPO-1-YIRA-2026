import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private supabase;

  constructor(private jwtService: JwtService, private config: ConfigService) {
    this.supabase = createClient(
      this.config.get('SUPABASE_URL', ''),
      this.config.get('SUPABASE_SERVICE_KEY', ''),
    );
  }

  generateCodeYira(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `YIR-${year}-${random}`;
  }

  async inscrireConseiller(dto: any) {
    const hashed_password = await bcrypt.hash(dto.password, 10);
    const { data, error } = await this.supabase
      .from('YiraConseiller')
      .insert({ ...dto, hashedPassword: hashed_password, country_code: dto.country_code || 'CI' })
      .select().single();
    if (error) throw new BadRequestException(error.message);
    const token = this.jwtService.sign({ sub: data.id, email: data.email, role: data.role, country_code: data.country_code });
    return { conseiller: data, access_token: token };
  }

  async loginConseiller(email: string, password: string) {
    const { data, error } = await this.supabase.from('YiraConseiller').select('*').eq('email', email).eq('actif', true).single();
    if (error || !data) throw new UnauthorizedException('Email ou mot de passe incorrect');
    const valid = await bcrypt.compare(password, data.hashedPassword);
    if (!valid) throw new UnauthorizedException('Email ou mot de passe incorrect');
    const token = this.jwtService.sign({ sub: data.id, email: data.email, role: data.role, country_code: data.country_code });
    const atConfigured = !!(process.env.AT_API_KEY && process.env.AT_API_KEY !== '');
    return {
      access_token: token,
      mode_sms: atConfigured ? 'REEL' : 'SIMULE',
      conseiller: { id: data.id, nom: data.nom, prenom: data.prenom, email: data.email, role: data.role }
    };
  }

  async inscrireBeneficiaire(dto: any) {
    const code_yira = this.generateCodeYira();
    const { data, error } = await this.supabase.from('YiraBeneficiaire')
      .insert({ id: crypto.randomUUID(), nom: dto.nom, prenom: dto.prenom, telephone: dto.telephone, genre: dto.genre, niveau: dto.niveau_etude, district: dto.district, country_code: dto.country_code || 'CI', codeYira: code_yira, statutParcours: 'INSCRIT', typeProfile: 'jeune', consentementRGPD: false, updatedAt: new Date().toISOString() })
      .select().single();
    if (error) throw new BadRequestException(error.message);
    return { beneficiaire: data, code_yira };
  }
  async loginAdmin(email: string, password: string) {
    // Credentials admin depuis les variables d'environnement
    const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@yira-ci.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'YiraAdmin2026!';
    const adminNom      = process.env.ADMIN_NOM      || 'Joseph-Marie N GUESSAN';

    if (email !== adminEmail) {
      throw new UnauthorizedException('Email admin incorrect');
    }
    const valid = (password||'').trim() === (adminPassword||'').trim();
    if (!valid) {
      throw new UnauthorizedException('Mot de passe admin incorrect');
    }
    const token = this.jwtService.sign({
      sub: 'admin-nohama-001',
      email: adminEmail,
      role: 'admin',
      nom: adminNom,
      country_code: 'CI',
    }, { expiresIn: '12h' });

    const atOk = !!(process.env.AT_API_KEY && process.env.AT_API_KEY !== '');
    return {
      access_token: token,
      mode_sms: atOk ? 'REEL' : 'SIMULE',
      user: {
        id:    'admin-nohama-001',
        email: adminEmail,
        nom:   adminNom,
        role:  'admin',
        type:  'admin',
      }
    };
  }

}
// Fix id 1774303501

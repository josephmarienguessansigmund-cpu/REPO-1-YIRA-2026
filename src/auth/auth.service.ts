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
      .insert({ ...dto, hashed_password, country_code: dto.country_code || 'CI' })
      .select().single();
    if (error) throw new BadRequestException(error.message);
    const token = this.jwtService.sign({ sub: data.id, email: data.email, grade: data.grade, country_code: data.country_code });
    return { conseiller: data, access_token: token };
  }

  async loginConseiller(email: string, password: string) {
    const { data, error } = await this.supabase.from('YiraConseiller').select('*').eq('email', email).eq('actif', true).single();
    if (error || !data) throw new UnauthorizedException('Email ou mot de passe incorrect');
    const valid = await bcrypt.compare(password, data.hashed_password);
    if (!valid) throw new UnauthorizedException('Email ou mot de passe incorrect');
    const token = this.jwtService.sign({ sub: data.id, email: data.email, grade: data.grade, country_code: data.country_code });
    return { access_token: token, conseiller: { id: data.id, nom: data.nom, prenom: data.prenom, email: data.email, grade: data.grade } };
  }

  async inscrireBeneficiaire(dto: any) {
    const code_yira = this.generateCodeYira();
    const { data, error } = await this.supabase.from('YiraBeneficiaire')
      .insert({ id: crypto.randomUUID(), nom: dto.nom, prenom: dto.prenom, telephone: dto.telephone, genre: dto.genre, niveau: dto.niveau_etude, district: dto.district, country_code: dto.country_code || 'CI', codeYira: code_yira, statutParcours: 'INSCRIT', typeProfile: 'jeune', consentementRGPD: false, updatedAt: new Date().toISOString() })
      .select().single();
    if (error) throw new BadRequestException(error.message);
    return { beneficiaire: data, code_yira };
  }
}

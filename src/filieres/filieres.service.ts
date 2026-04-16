import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class FilieresService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.get<string>('SUPABASE_URL'),
      this.config.get<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  async onModuleInit() {}

  async findAll(pays: string = 'CI') {
    const { data, error } = await this.supabase
      .from('filieres')
      .select('*')
      .eq('pays_code', pays.toUpperCase())
      .eq('actif', true)
      .order('domaine', { ascending: true });
    if (error) throw error;
    return { data, total: data?.length ?? 0, pays };
  }
}
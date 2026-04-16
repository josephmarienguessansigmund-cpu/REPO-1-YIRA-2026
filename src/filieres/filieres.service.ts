import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class FilieresService {
  private supabase: SupabaseClient;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.get<string>('SUPABASE_URL'),
      this.config.get<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  async findAll(pays: string = 'CI') {
    const { data, error } = await this.supabase
      .from('filieres')
      .select('*')
      .eq('pays_code', pays.toUpperCase())
      .order('domaine');
    if (error) throw new Error(error.message);
    return { data: data ?? [], total: data?.length ?? 0, pays };
  }
}
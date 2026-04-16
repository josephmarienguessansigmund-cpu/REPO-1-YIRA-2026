import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Cette version "client" inclut la sécurité RLS automatique
  readonly client = this.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // On force 'CI' pour l'instant (à lier à ta session plus tard)
          const country = 'CI'; 

          return (this as any).$transaction(async (tx: any) => {
            await tx.$executeRawUnsafe(`SET LOCAL app.current_country = '${country}'`);
            return query(args);
          });
        },
      },
    },
  });

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
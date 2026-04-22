import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();

    // Apply RLS middleware: SET LOCAL app.current_country before every query.
    // Using Object.assign to merge the extended client back onto this instance
    // avoids the type conflict that arises from storing $extends() as a class property.
    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const country = 'CI';
            return (this as any).$transaction(async (tx: any) => {
              await tx.$executeRawUnsafe(`SET LOCAL app.current_country = '${country}'`);
              return query(args);
            });
          },
        },
      },
    });

    Object.assign(this, extended);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

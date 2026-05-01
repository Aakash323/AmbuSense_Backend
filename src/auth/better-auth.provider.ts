import { ConfigService } from '@nestjs/config';
import type { Auth } from 'better-auth';
import { MongoClient } from 'mongodb';
import { UserRole } from '../constants/enums';

type BetterAuthModule = typeof import('better-auth');
type MongoAdapterModule = typeof import('@better-auth/mongo-adapter');
type MongodbAdapter = MongoAdapterModule['mongodbAdapter'];

const dynamicImport = new Function(
  'specifier',
  'return import(specifier)',
) as <TModule>(specifier: string) => Promise<TModule>;

export type AmbuSenseAuth = Auth<ReturnType<typeof getBetterAuthOptions>>;

function getBetterAuthOptions(
  client: MongoClient,
  configService: ConfigService,
  mongodbAdapter: MongodbAdapter,
) {
  const databaseName = configService.get<string>('MONGODB_DB_NAME');

  return {
    secret: configService.get<string>('BETTER_AUTH_SECRET'),
    baseURL: configService.get<string>('BETTER_AUTH_URL'),
    database: mongodbAdapter(client.db(databaseName), {
      client,
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      modelName: 'users',
      fields: {
        name: 'fullName',
      },
      additionalFields: {
        phone: {
          type: 'string',
          required: true,
          unique: true,
          input: true,
        },
        role: {
          type: Object.values(UserRole),
          required: true,
          input: true,
        },
        isActive: {
          type: 'boolean',
          required: false,
          defaultValue: true,
          input: false,
        },
        lastLoginAt: {
          type: 'date',
          required: false,
          input: false,
        },
      },
    },
  } as const;
}

export async function createBetterAuth(
  configService: ConfigService,
): Promise<{ auth: AmbuSenseAuth; client: MongoClient }> {
  const uri = configService.get<string>('MONGODB_URI');
  const secret = configService.get<string>('BETTER_AUTH_SECRET');

  if (!uri) {
    throw new Error('MONGODB_URI is required for Better Auth');
  }

  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is required for Better Auth');
  }

  const client = new MongoClient(uri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();

  const [{ betterAuth }, { mongodbAdapter }] = await Promise.all([
    dynamicImport<BetterAuthModule>('better-auth'),
    dynamicImport<MongoAdapterModule>('@better-auth/mongo-adapter'),
  ]);

  return {
    auth: betterAuth(getBetterAuthOptions(client, configService, mongodbAdapter)),
    client,
  };
}

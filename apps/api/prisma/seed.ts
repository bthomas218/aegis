import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';
import { UserRoles } from '../src/generated/prisma/enums';

loadEnvFile();

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const seedUsers = [
  {
    email: 'admin@aegis.local',
    password: 'Admin123!',
    role: UserRoles.ADMIN,
  },
  {
    email: 'super-admin@aegis.local',
    password: 'SuperAdmin123!',
    role: UserRoles.SYSTEM_ADMIN,
  },
] as const;

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const envFile = readFileSync(envPath, 'utf8');

  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  for (const seedUser of seedUsers) {
    const password_hash = await argon2.hash(seedUser.password);

    await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {
        password_hash,
        role: seedUser.role,
      },
      create: {
        email: seedUser.email,
        password_hash,
        role: seedUser.role,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

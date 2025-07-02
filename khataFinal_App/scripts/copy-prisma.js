// scripts/copy-prisma.js
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Paths
const PRISMA_CLIENT = join('node_modules', '@prisma', 'client');
const PRISMA_ENGINE = join('.prisma', 'client', 'query_engine-windows.dll.node'); // or mac/linux if needed
const OUT_DIR = join('out', 'main');

// Destination paths
const destClientDir = join(OUT_DIR, 'node_modules', '@prisma', 'client');
const destEngineDir = join(OUT_DIR, '.prisma', 'client');

// Ensure directories exist
mkdirSync(destClientDir, { recursive: true });
mkdirSync(destEngineDir, { recursive: true });

// Copy client/index.js
copyFileSync(join(PRISMA_CLIENT, 'index.js'), join(destClientDir, 'index.js'));

// Copy engine
copyFileSync(PRISMA_ENGINE, join(destEngineDir, 'query_engine-windows.dll.node'));

console.log('✅ Prisma client and engine copied to out/main/');
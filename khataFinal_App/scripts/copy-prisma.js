// scripts/copy-prisma.js
import fs from 'fs-extra';
import { join, dirname } from 'path';
const { copyFileSync, mkdirSync, existsSync, copySync } = fs;

// Function to safely copy a file
function safeCopyFile(src, dest) {
  try {
    if (existsSync(src)) {
      copyFileSync(src, dest);
      return true;
    } else {
      console.log(`File not found: ${src}`);
      return false;
    }
  } catch (error) {
    console.error(`Error copying ${src} to ${dest}:`, error);
    return false;
  }
}

// Function to copy Prisma files
function copyPrismaFiles(basePath) {
  // Paths
  const PRISMA_CLIENT = join('node_modules', '@prisma', 'client');
  const PRISMA_ENGINE_WIN = join('node_modules', '.prisma', 'client', 'query-engine-windows.dll.node');
  const PRISMA_ENGINE_WIN_ALT = join('.prisma', 'client', 'query_engine-windows.dll.node');
  
  // Destination paths
  const destClientDir = join(basePath, 'node_modules', '@prisma', 'client');
  const destEngineDir = join(basePath, '.prisma', 'client');
  const destPrismaDir = join(basePath, 'prisma');
  const destNodeModulesDir = join(basePath, 'node_modules', '.prisma', 'client');

  // Ensure directories exist
  mkdirSync(destClientDir, { recursive: true });
  mkdirSync(destEngineDir, { recursive: true });
  mkdirSync(destPrismaDir, { recursive: true });
  mkdirSync(destNodeModulesDir, { recursive: true });

  try {
    // Copy entire @prisma/client directory
    if (existsSync(PRISMA_CLIENT)) {
      copySync(PRISMA_CLIENT, destClientDir);
      console.log(`✅ Copied @prisma/client to ${destClientDir}`);
    }
    
    // Copy .prisma directory
    if (existsSync('.prisma')) {
      copySync('.prisma', join(basePath, '.prisma'));
      console.log(`✅ Copied .prisma directory to ${basePath}`);
    }
    
    // Copy node_modules/.prisma directory
    if (existsSync(join('node_modules', '.prisma'))) {
      copySync(join('node_modules', '.prisma'), destNodeModulesDir);
      console.log(`✅ Copied node_modules/.prisma to ${destNodeModulesDir}`);
    }
    
    // Copy schema.prisma and migrations if they exist
    if (existsSync('prisma')) {
      copySync('prisma', destPrismaDir);
      console.log(`✅ Copied prisma directory to ${destPrismaDir}`);
    }

    // Try different engine paths (different versions of Prisma have different naming)
    let engineCopied = false;
    
    if (existsSync(PRISMA_ENGINE_WIN)) {
      safeCopyFile(PRISMA_ENGINE_WIN, join(destEngineDir, 'query-engine-windows.dll.node'));
      engineCopied = true;
    }
    
    if (existsSync(PRISMA_ENGINE_WIN_ALT)) {
      safeCopyFile(PRISMA_ENGINE_WIN_ALT, join(destEngineDir, 'query_engine-windows.dll.node'));
      engineCopied = true;
    }
    
    console.log(`✅ Prisma files copied to ${basePath}`);
  } catch (error) {
    console.error('❌ Error copying Prisma files:', error);
  }
}

// Copy to out directory for development
copyPrismaFiles('out');

// If dist directory exists (after packaging), also copy there
const distPath = join('dist', 'win-unpacked', 'resources', 'app');
if (existsSync(join('dist', 'win-unpacked'))) {
  copyPrismaFiles(distPath);
  console.log('✅ Prisma files also copied to packaged app');
}

// Also copy to the main out directory
if (existsSync('out')) {
  copyPrismaFiles('out');
  console.log('✅ Prisma files copied to out directory');
}
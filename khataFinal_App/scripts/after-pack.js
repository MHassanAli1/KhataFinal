// scripts/after-pack.js
import fs from 'fs-extra';
import path from 'path';

export default async function(context) {
  console.log('Running after-pack script...');
  
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName === 'win32') {
    const resourcesPath = path.join(appOutDir, 'resources');
    const appPath = path.join(resourcesPath, 'app');
    
    // Copy Prisma files
    try {
      // Copy @prisma/client
      const prismaClientSrc = path.join(process.cwd(), 'node_modules', '@prisma', 'client');
      const prismaClientDest = path.join(appPath, 'node_modules', '@prisma', 'client');
      
      if (fs.existsSync(prismaClientSrc)) {
        await fs.copy(prismaClientSrc, prismaClientDest);
        console.log('✅ Copied @prisma/client');
      }
      
      // Copy node-fetch
      const nodeFetchSrc = path.join(process.cwd(), 'node_modules', 'node-fetch');
      const nodeFetchDest = path.join(appPath, 'node_modules', 'node-fetch');
      
      if (fs.existsSync(nodeFetchSrc)) {
        await fs.copy(nodeFetchSrc, nodeFetchDest);
        console.log('✅ Copied node-fetch');
      }
      
      // Copy @electron-toolkit modules
      const electronToolkitSrc = path.join(process.cwd(), 'node_modules', '@electron-toolkit');
      const electronToolkitDest = path.join(appPath, 'node_modules', '@electron-toolkit');
      
      if (fs.existsSync(electronToolkitSrc)) {
        await fs.copy(electronToolkitSrc, electronToolkitDest);
        console.log('✅ Copied @electron-toolkit');
      }
      
      // Copy .prisma directory from node_modules
      const prismaDirSrc = path.join(process.cwd(), 'node_modules', '.prisma');
      const prismaDirDest = path.join(appPath, 'node_modules', '.prisma');
      
      if (fs.existsSync(prismaDirSrc)) {
        await fs.copy(prismaDirSrc, prismaDirDest);
        console.log('✅ Copied .prisma directory');
      }
      
      // Copy prisma schema and migrations
      const prismaSchemaSource = path.join(process.cwd(), 'prisma');
      const prismaSchemaDest = path.join(appPath, 'prisma');
      
      if (fs.existsSync(prismaSchemaSource)) {
        await fs.copy(prismaSchemaSource, prismaSchemaDest);
        console.log('✅ Copied prisma schema and migrations');
      }
      
      console.log('✅ After-pack script completed successfully');
    } catch (error) {
      console.error('❌ Error in after-pack script:', error);
    }
  }
};
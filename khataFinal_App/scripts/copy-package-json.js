// scripts/copy-package-json.js
import fs from 'fs-extra';
import { join } from 'path';

// Read the original package.json
const packageJson = fs.readJsonSync('package.json');

// Create a minimal package.json for production
const productionPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: "main/index.js", // For packaged app, it should be relative to app directory
  author: packageJson.author,
  license: packageJson.license,
  dependencies: {
    '@electron-toolkit/preload': packageJson.dependencies['@electron-toolkit/preload'],
    '@electron-toolkit/utils': packageJson.dependencies['@electron-toolkit/utils'],
    '@prisma/client': packageJson.dependencies['@prisma/client'],
    'bcryptjs': packageJson.dependencies['bcryptjs'],
    'electron-store': packageJson.dependencies['electron-store'],
    'electron-updater': packageJson.dependencies['electron-updater'],
    'node-fetch': packageJson.dependencies['node-fetch'],
    'react': packageJson.dependencies['react'],
    'react-dom': packageJson.dependencies['react-dom'],
    'react-router-dom': packageJson.dependencies['react-router-dom'],
    'chart.js': packageJson.dependencies['chart.js'],
    'chartjs-adapter-date-fns': packageJson.dependencies['chartjs-adapter-date-fns'],
    'date-fns': packageJson.dependencies['date-fns'],
    'lucide-react': packageJson.dependencies['lucide-react'],
    'react-chartjs-2': packageJson.dependencies['react-chartjs-2'],
    'recharts': packageJson.dependencies['recharts'],
    'react-simple-keyboard': packageJson.dependencies['react-simple-keyboard'],
    'simple-keyboard': packageJson.dependencies['simple-keyboard']
  }
};

// Write the package.json to the out directory
fs.writeJsonSync(join('out', 'package.json'), productionPackageJson, { spaces: 2 });
console.log('✅ Copied package.json to out directory');
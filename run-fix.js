// Wrapper to run fix with proper environment
process.env.NODE_ENV = 'production';

// Mock electron app object
global.app = {
  isPackaged: false,
  getPath: (name) => {
    if (name === 'userData') return __dirname;
    return __dirname;
  }
};

// Now run the fix
require('./fix-corrupt-data.js');

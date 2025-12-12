module.exports = {
  apps: [{
    name: 'crm-backend',
    script: 'dist/main.js',
    cwd: '/home/azureuser/crm-ngso-whatsapp/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      CHROME_BIN: '/snap/bin/chromium'
    }
  }]
};

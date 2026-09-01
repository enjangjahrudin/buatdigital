module.exports = {
  apps: [
    {
      name: 'buatdigital-portal',
      script: 'src/server.js',
      cwd: '/www/wwwroot/buatdigital.id',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    }
  ]
};

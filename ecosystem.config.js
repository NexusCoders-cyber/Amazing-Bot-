module.exports = {
  apps: [
    {
      name: 'ilom-bot',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: './logs/pm2.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      kill_timeout: 5000,
      listen_timeout: 8000,
      cron_restart: '0 2 * * *',
      ignore_watch: [
        'node_modules',
        'logs',
        'temp',
        'session',
        'media',
        'backups'
      ],
      watch_options: {
        followSymlinks: false
      },
      source_map_support: false,
      instance_var: 'INSTANCE_ID',
      combine_logs: true,
      log_type: 'json'
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'https://github.com/',
      path: '/home/ubuntu/ilom-bot',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install nodejs npm mongodb redis-server -y',
      'post-setup': 'npm install && npm run seed'
    },
    staging: {
      user: 'ubuntu',
      host: ['staging-server-ip'],
      ref: 'origin/develop',
      repo: 'https://github.com/ilom-tech/whatsapp-bot.git',
      path: '/home/ubuntu/ilom-bot-staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
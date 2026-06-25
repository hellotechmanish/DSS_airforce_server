module.exports = {
  apps: [
    {
      name: "redis-engine",
      script: "redis-server",
      instances: 1,
      exec_mode: "fork",
      watch: false,
    },
    {
      name: "mern-server",
      script: "app.js",
      instances: 3,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

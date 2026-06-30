module.exports = {
  apps: [
    {
      name: "redis-engine",
      script: "redis-server",
      exec_mode: "fork",
      instances: 1,
    },
    {
      name: "mern-server",
      script: "app.js",
      exec_mode: "fork", // ya cluster bhi rakh sakte hain
      instances: 1,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

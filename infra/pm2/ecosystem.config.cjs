module.exports = {
  apps: [
    {
      name: "nexmint-api",
      cwd: "./apps/api",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "nexmint-workers",
      cwd: "./apps/api",
      script: "dist/workers/index.js",
      instances: 1,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};

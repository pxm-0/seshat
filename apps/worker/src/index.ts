const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

console.log(`Seshat worker bootstrap ready. Redis: ${redisUrl}`);

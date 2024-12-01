import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 2000,
          reconnectStrategy: false
        }
      });

      redisClient.on('error', (err) => {
        console.warn('Redis Client Error:', err.message);
        redisClient = null;
      });

      await redisClient.connect();
      console.log('Successfully connected to Redis');
    } catch (err) {
      console.warn('Failed to connect to Redis, using in-memory mode');
      redisClient = null;
    }
  }

  return redisClient;
}

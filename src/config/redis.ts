import Redis from 'ioredis';
import { config } from './index';

// Create Redis client for general use
export const redis = new Redis(config.redis.url, {
  password: config.redis.password,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Create separate Redis connection for BullMQ
export const bullRedis = new Redis(config.redis.url, {
  password: config.redis.password,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Handle Redis connection events
redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Handle cleanup on app termination
const cleanup = async () => {
  await redis.quit();
  await bullRedis.quit();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
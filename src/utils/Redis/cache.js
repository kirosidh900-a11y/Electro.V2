import redisClient from "../partials/redisClient.util.js";

// GET CACHE
export const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);

    if (!data) {
      console.warn("❌ Cache MISS:", key);
      return null;
    }

    // SAFE PARSE
    try {
      console.warn("🎯 Cache HIT:", key);
      return JSON.parse(data);
    } catch (err) {
      console.error("⚠️ Invalid cache detected, deleting:", key, err);
      await redisClient.del(key);
      return null;
    }
  } catch (error) {
    console.error("Cache GET Error:", error);
    return null;
  }
};

// SET CACHE
export const setCache = async (key, value, ttl = 600) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    console.warn("✅ Cache SET:", key);
  } catch (error) {
    console.error("Cache SET Error:", error);
  }
};

// DELETE CACHE (single key)
export const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
    console.warn("🗑️ Cache DELETED:", key);
  } catch (error) {
    console.error("Cache DELETE Error:", error);
  }
};

// DELETE BY PATTERN (PRO VERSION)
export const deleteCacheByPattern = async (pattern) => {
  try {
    const keys = [];

    for await (const key of redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      if (Array.isArray(key)) {
        keys.push(...key);
      } else if (key) {
        keys.push(key);
      }
    }

    console.warn("🔍 Clean Keys:", keys);

    if (keys.length > 0) {
      const pipeline = redisClient.multi();

      for (const key of keys) {
        pipeline.del(key);
      }

      await pipeline.exec();

      console.warn(`🗑️ Deleted ${keys.length} keys`);
    } else {
      console.warn("⚠️ No valid keys to delete");
    }
  } catch (error) {
    console.error("Cache Pattern Delete Error:", error);
  }
};

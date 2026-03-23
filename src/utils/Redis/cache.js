import redisClient from "../partials/redisClient.util.js";

// GET CACHE
export const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);

    if (!data) {
      console.log("❌ Cache MISS:", key);
      return null;
    }

    console.log("⚡ Cache HIT:", key);

    // ✅ SAFE PARSE
    try {
      return JSON.parse(data);
    } catch (err) {
      console.log("⚠️ Invalid cache detected, deleting:", key);
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
    console.log("✅ Cache SET:", key);
  } catch (error) {
    console.error("Cache SET Error:", error);
  }
};

// DELETE CACHE (single key)
export const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
    console.log("🗑️ Cache DELETED:", key);
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
      } else {
        keys.push(key);
      }
    }

    console.log("🔍 Keys found:", keys);

    if (keys.length > 0) {
      const deletedCount = await redisClient.del(...keys);
      console.log(`🗑️ Deleted ${deletedCount} keys`);
    }
  } catch (error) {
    console.error("Cache Pattern Delete Error:", error);
  }
};

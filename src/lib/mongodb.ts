import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "simple_com";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise__: Promise<MongoClient> | undefined;
}

export async function getDb() {
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  const clientPromise =
    global.__mongoClientPromise__ ||
    (global.__mongoClientPromise__ = new MongoClient(uri, {
      // Fail faster in dev when MongoDB is unreachable/misconfigured.
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
    }).connect());
  let mongoClient: MongoClient;
  try {
    mongoClient = await clientPromise;
  } catch (error) {
    global.__mongoClientPromise__ = undefined;
    const message = error instanceof Error ? error.message : "Unknown MongoDB connection error";
    throw new Error(
      `MongoDB connection failed: ${message}. Check Atlas cluster status, Network Access allowlist, and TLS/network restrictions.`
    );
  }
  return mongoClient.db(dbName);
}

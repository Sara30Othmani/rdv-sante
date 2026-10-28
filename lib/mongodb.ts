import mongoose from "mongoose";

// Connexion mise en cache : sans cela, le rechargement à chaud de Next ouvre
// une nouvelle connexion à chaque modification de fichier.
const g = globalThis as unknown as {
  _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};
const cache = (g._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  // Vérifié ici (et non à l'import) pour que `next build` fonctionne sans base.
  if (!uri) throw new Error("MONGODB_URI manquant (voir .env.example).");

  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(uri, { bufferCommands: false });
  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null; // permet de réessayer au prochain appel
    throw e;
  }
  return cache.conn;
}

import { createClient } from "redis";

export default function () {
  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", (e) => console.log("An error occured ", e));
  client.on("connection", () =>
    console.log("Connected to redis server successfully")
  );
  client.connect();

  return client;
}

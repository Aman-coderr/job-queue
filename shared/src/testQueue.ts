import * as dotenv from "dotenv";
dotenv.config();

import { enqueue, dequeue, getQueueLength } from "./index";

async function main() {
  await enqueue("fake-id-1", "NORMAL");
  await enqueue("fake-id-2", "HIGH");
  await enqueue("fake-id-3", "NORMAL");

  console.log("Queue lengths after enqueue:", await getQueueLength());

  console.log("Dequeue 1:", await dequeue(1));
  console.log("Dequeue 2:", await dequeue(1));
  console.log("Dequeue 3:", await dequeue(1));

  console.log("Queue lengths after dequeue:", await getQueueLength());

  process.exit(0);
}

main();

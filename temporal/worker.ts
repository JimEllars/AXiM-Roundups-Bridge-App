import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
  const clientCert = process.env.TEMPORAL_TLS_CERT;
  const clientKey = process.env.TEMPORAL_TLS_KEY;

  let connectionOptions: any = {};

  if (clientCert && clientKey) {
    connectionOptions = {
      address,
      tls: {
        clientCertPair: {
          crt: Buffer.from(clientCert),
          key: Buffer.from(clientKey),
        },
      },
    };
  } else {
    connectionOptions = { address };
  }

  const connection = await NativeConnection.connect(connectionOptions);

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: 'roundups-queue',
    workflowsPath: path.join(__dirname, 'workflows.ts'),
    activities,
  });

  console.log(`[Temporal Worker] Listening on task queue: roundups-queue...`);
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

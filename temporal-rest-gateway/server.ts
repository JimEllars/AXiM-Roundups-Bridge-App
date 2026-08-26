import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Connection, Client } from '@temporalio/client';

dotenv.config();

const app = express();
app.use(express.json());

// CORS Configuration - restrict to Cloudflare Edge Worker origins
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://axim-roundups-bridge.pages.dev';
app.use(cors({
  origin: allowedOrigin
}));

const PORT = process.env.PORT || 3001;

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: Date.now() });
});

// Authentication Middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const apiSecret = process.env.TEMPORAL_REST_SECRET;

  if (!apiSecret) {
    console.error('TEMPORAL_REST_SECRET is not configured in the environment.');
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  if (token !== apiSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};

let temporalClient: Client | null = null;

async function getTemporalClient() {
  if (temporalClient) return temporalClient;

  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
  const clientCert = process.env.TEMPORAL_TLS_CERT;
  const clientKey = process.env.TEMPORAL_TLS_KEY;

  let connectionOptions: any = { address };

  if (clientCert && clientKey) {
    connectionOptions.tls = {
      clientCertPair: {
        crt: Buffer.from(clientCert),
        key: Buffer.from(clientKey),
      },
    };
  }

  const connection = await Connection.connect(connectionOptions);

  temporalClient = new Client({
    connection,
    namespace,
  });

  return temporalClient;
}

// Rate Limiter
const startWorkflowLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per `window` (here, per 1 minute)
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/workflows/start', startWorkflowLimiter, authenticate, async (req: Request, res: Response) => {
  try {
    const { campaign_id, roundups_job_id } = req.body;

    if (!campaign_id || !roundups_job_id) {
      return res.status(400).json({ error: 'Missing campaign_id or roundups_job_id' });
    }

    const client = await getTemporalClient();
    const workflowId = `roundup-generation-${roundups_job_id}`;

    await client.workflow.start('RoundupGenerationWorkflow', {
      args: [campaign_id, roundups_job_id],
      taskQueue: 'roundups-queue',
      workflowId: workflowId,
    });

    res.status(200).json({ status: 'ok', workflowId });
  } catch (error) {
    console.error('Error starting Temporal workflow:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`[REST Gateway] Listening on port ${PORT}`);
});

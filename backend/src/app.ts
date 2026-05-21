import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { v1Router } from './routes/v1/router';
import { errorMiddleware } from './middleware/error.middleware';

export const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.get('/health', (_req, res) => {
  res.status(200).json({ status: true, message: 'ok' });
});
app.use('/api/v1', v1Router);
app.use(errorMiddleware);

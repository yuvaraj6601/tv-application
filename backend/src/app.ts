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
// Uploaded media is embedded cross-origin (dashboard thumbnails, TV client playback), so it needs
// its own relaxed Cross-Origin-Resource-Policy — helmet()'s global default ("same-origin") would
// otherwise block the browser from rendering these images/videos when loaded from another origin.
app.use('/uploads', helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }), express.static('uploads'));
app.get('/health', (_req, res) => {
  res.status(200).json({ status: true, message: 'ok' });
});
app.use('/api/v1', v1Router);
app.use(errorMiddleware);

import express from 'express';
import { authRoute } from './auth.route';
import { deviceRoute } from './device.route';

export const v1Router = express.Router();

v1Router.use('/auth', authRoute);
v1Router.use('/device', deviceRoute);

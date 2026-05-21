import Joi from 'joi';

export const deviceRegisterValidation = Joi.object({
  deviceName: Joi.string().min(2).max(120).required(),
  deviceUniqueId: Joi.string().min(4).max(255).required()
});

export const devicePairValidation = Joi.object({
  pairingCode: Joi.string().pattern(/^\d{4}$/).required()
});

export const deviceParamValidation = Joi.object({
  deviceId: Joi.string().required()
});

export const deviceHeartbeatValidation = Joi.object({
  appVersion: Joi.string().max(50).optional()
});

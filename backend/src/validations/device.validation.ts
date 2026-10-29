import Joi from 'joi';

const MAC_ADDRESS_PATTERN = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export const deviceRegisterValidation = Joi.object({
  deviceName: Joi.string().min(2).max(120).required(),
  deviceUniqueId: Joi.string().min(4).max(255).required(),
  macAddress: Joi.string().pattern(MAC_ADDRESS_PATTERN).optional()
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

export const deviceOrientationUpdateValidation = Joi.object({
  orientation: Joi.string().valid('PORTRAIT', 'LANDSCAPE', 'PORTRAIT_FLIP', 'LANDSCAPE_FLIP').required()
});

// Matches the Python server's local-dev PI_ID default (see pythonServer/.env.example) — lets a
// device be linked to a locally-running dev instance without a real Pi MAC address.
export const LOCAL_DEV_PI_ID = 'local-dev-test';

export const devicePiIdUpdateValidation = Joi.object({
  piId: Joi.string().max(17).required()
});

export const deviceNameUpdateValidation = Joi.object({
  deviceName: Joi.string().min(2).max(120).required()
});

export const visitorTableQueryValidation = Joi.object({
  sortBy: Joi.string().valid('watchTime', 'visits', 'firstSeen').default('watchTime'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  gender: Joi.string().valid('male', 'female', 'unknown').optional(),
  visits: Joi.string().valid('oneTime', 'returning').optional(),
  ageBucket: Joi.string().pattern(/^(\d{1,3}-\d{1,3}|\d{1,3}\+)$/).optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10)
});

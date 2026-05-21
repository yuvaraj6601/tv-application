import Joi from 'joi';

export const contentCreateValidation = Joi.object({
  type: Joi.string().valid('IMAGE', 'VIDEO', 'WEBPAGE').required(),
  url: Joi.when('type', {
    is: 'WEBPAGE',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().allow('').optional()
  }),
  duration: Joi.number().integer().min(1).optional(),
  order: Joi.number().integer().min(1).required()
});

export const contentUpdateValidation = Joi.object({
  type: Joi.string().valid('IMAGE', 'VIDEO', 'WEBPAGE').optional(),
  url: Joi.string().uri().optional(),
  duration: Joi.number().integer().min(1).optional(),
  order: Joi.number().integer().min(1).optional()
});

export const contentDeleteParamsValidation = Joi.object({
  deviceId: Joi.string().required(),
  contentId: Joi.string().required()
});

export const contentListParamsValidation = Joi.object({
  deviceId: Joi.string().required()
});

export const contentOrderValidation = Joi.object({
  contentIds: Joi.array().items(Joi.string().required()).min(1).required()
});

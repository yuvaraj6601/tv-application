import Joi from 'joi';

const webUrl = () =>
  Joi.string().custom((value: string, helpers) => {
    const normalizedValue = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    try {
      const parsedUrl = new URL(normalizedValue);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return helpers.error('any.invalid');
      }
      return parsedUrl.toString();
    } catch (_error) {
      return helpers.error('any.invalid');
    }
  }, 'web url normalization');

export const contentCreateValidation = Joi.object({
  type: Joi.string().valid('IMAGE', 'VIDEO', 'WEBPAGE').required(),
  url: Joi.when('type', {
    is: 'WEBPAGE',
    then: webUrl().required(),
    otherwise: Joi.string().allow('').optional()
  }),
  duration: Joi.number().integer().min(1).optional()
});

export const contentLibraryCreateValidation = Joi.object({
  type: Joi.string().valid('IMAGE', 'VIDEO', 'WEBPAGE').required(),
  url: Joi.when('type', {
    is: 'WEBPAGE',
    then: webUrl().required(),
    otherwise: Joi.string().allow('').optional()
  }),
  duration: Joi.number().integer().min(1).optional()
});

export const contentUpdateValidation = Joi.object({
  type: Joi.string().valid('IMAGE', 'VIDEO', 'WEBPAGE').optional(),
  url: webUrl().optional(),
  duration: Joi.number().integer().min(1).optional(),
  order: Joi.number().integer().min(1).optional()
});

export const contentAttachValidation = Joi.object({
  contentId: Joi.string().required()
});

export const contentDeleteParamsValidation = Joi.object({
  deviceId: Joi.string().required(),
  contentId: Joi.string().required()
});

export const contentLibraryDeleteParamsValidation = Joi.object({
  contentId: Joi.string().required()
});

export const contentListParamsValidation = Joi.object({
  deviceId: Joi.string().required()
});

export const contentOrderValidation = Joi.object({
  contentIds: Joi.array().items(Joi.string().required()).min(1).required()
});

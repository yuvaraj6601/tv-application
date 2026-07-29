import Joi from 'joi';

export const loginValidation = Joi.object({
  email: Joi.string()
    .email({
      tlds: {
        allow: false
      }
    })
    .required(),
  password: Joi.string().min(6).required()
});

export const registerValidation = Joi.object({
  email: Joi.string()
    .email({
      tlds: {
        allow: false
      }
    })
    .required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match'
  })
});

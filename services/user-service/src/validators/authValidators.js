const Joi = require('joi');
const { validate } = require('../../../shared/errorHandling');

const registerSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(30).required(),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
  firstName: Joi.string().trim().max(100).allow('', null),
  lastName: Joi.string().trim().max(100).allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(1).required()
});

const checkUsernameSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(30).required()
});

module.exports = {
  registerSchema,
  loginSchema,
  checkUsernameSchema,
  validateRegister: validate(registerSchema, 'body'),
  validateLogin: validate(loginSchema, 'body'),
  validateCheckUsername: validate(checkUsernameSchema, 'query')
};

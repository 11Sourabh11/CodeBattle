import { body, param, query, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

export const validateUserUpdate = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('preferredLanguage')
    .optional()
    .isIn(['javascript', 'python', 'cpp', 'java', 'go', 'rust'])
    .withMessage('Invalid programming language'),
  
  handleValidationErrors
];

// Room validation rules
export const validateRoomCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be between 1 and 100 characters'),
  
  body('type')
    .optional()
    .isIn(['public', 'private', 'custom'])
    .withMessage('Invalid room type'),
  
  body('settings.maxParticipants')
    .optional()
    .isInt({ min: 2, max: 10 })
    .withMessage('Max participants must be between 2 and 10'),
  
  body('settings.difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level'),
  
  body('settings.language')
    .optional()
    .isIn(['javascript', 'python', 'cpp', 'java', 'go', 'rust', 'any'])
    .withMessage('Invalid programming language'),
  
  body('settings.timeLimit')
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage('Time limit must be between 5 and 60 minutes'),
  
  body('password')
    .optional()
    .isLength({ min: 4, max: 20 })
    .withMessage('Password must be between 4 and 20 characters'),
  
  handleValidationErrors
];

export const validateRoomJoin = [
  body('password')
    .optional()
    .isLength({ min: 4, max: 20 })
    .withMessage('Password must be between 4 and 20 characters'),
  
  handleValidationErrors
];

// Problem validation rules
export const validateProblemCreation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  
  body('difficulty')
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level'),
  
  body('category')
    .isIn([
      'array', 'string', 'hash-table', 'dynamic-programming',
      'math', 'sorting', 'greedy', 'tree', 'graph', 'binary-search',
      'two-pointers', 'sliding-window', 'stack', 'queue', 'recursion'
    ])
    .withMessage('Invalid category'),
  
  body('examples')
    .isArray({ min: 1 })
    .withMessage('At least one example is required'),
  
  body('examples.*.input')
    .notEmpty()
    .withMessage('Example input is required'),
  
  body('examples.*.output')
    .notEmpty()
    .withMessage('Example output is required'),
  
  body('testCases')
    .isArray({ min: 1 })
    .withMessage('At least one test case is required'),
  
  body('testCases.*.input')
    .notEmpty()
    .withMessage('Test case input is required'),
  
  body('testCases.*.expectedOutput')
    .notEmpty()
    .withMessage('Test case expected output is required'),
  
  handleValidationErrors
];

// Submission validation rules
export const validateCodeSubmission = [
  body('code')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Code must be between 1 and 10000 characters'),
  
  body('language')
    .isIn(['javascript', 'python', 'cpp', 'java', 'go', 'rust'])
    .withMessage('Invalid programming language'),
  
  handleValidationErrors
];

// Chat validation rules
export const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters'),
  
  handleValidationErrors
];

// Parameter validation rules
export const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

export const validateRoomId = [
  param('roomId')
    .isAlphanumeric()
    .isLength({ min: 6, max: 12 })
    .withMessage('Invalid room ID format'),
  
  handleValidationErrors
];

// Query validation rules
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .isIn(['newest', 'oldest', 'rating', 'difficulty', 'popularity'])
    .withMessage('Invalid sort option'),
  
  handleValidationErrors
];

export const validateProblemFilters = [
  query('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level'),
  
  query('category')
    .optional()
    .isIn([
      'array', 'string', 'hash-table', 'dynamic-programming',
      'math', 'sorting', 'greedy', 'tree', 'graph', 'binary-search',
      'two-pointers', 'sliding-window', 'stack', 'queue', 'recursion'
    ])
    .withMessage('Invalid category'),
  
  query('language')
    .optional()
    .isIn(['javascript', 'python', 'cpp', 'java', 'go', 'rust'])
    .withMessage('Invalid programming language'),
  
  handleValidationErrors
];

// Password reset validation
export const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

export const validatePasswordResetConfirm = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];
// Mock code executor for demonstration
// In a real implementation, this would integrate with Docker containers
// or services like Judge0 API for secure code execution

export const executeCode = async (code, language, testCases, options = {}) => {
  try {
    const { timeLimit = 2000, memoryLimit = 256 } = options;
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const results = [];
    
    for (const testCase of testCases) {
      const result = await runSingleTest(code, language, testCase, { timeLimit, memoryLimit });
      results.push(result);
    }
    
    return results;
    
  } catch (error) {
    console.error('Code execution error:', error);
    throw new Error('Failed to execute code');
  }
};

const runSingleTest = async (code, language, testCase, options) => {
  try {
    // Mock test execution logic
    // This would normally run in a sandboxed environment
    
    const { input, expectedOutput } = testCase;
    
    // Simulate different outcomes based on code patterns
    const passed = simulateTestResult(code, input, expectedOutput, language);
    
    // Generate mock execution time (0-2000ms)
    const executionTime = Math.floor(Math.random() * options.timeLimit);
    
    // Generate mock memory usage (1-256MB)
    const memoryUsed = Math.floor(Math.random() * options.memoryLimit) + 1;
    
    let actualOutput = expectedOutput;
    let error = null;
    
    if (!passed) {
      // Generate mock incorrect output
      actualOutput = generateMockOutput(expectedOutput);
    }
    
    // Simulate different error types occasionally
    if (Math.random() < 0.05) { // 5% chance of error
      error = generateMockError(language);
      return {
        input,
        expectedOutput,
        actualOutput: '',
        passed: false,
        executionTime,
        memoryUsed,
        error
      };
    }
    
    return {
      input,
      expectedOutput,
      actualOutput,
      passed,
      executionTime,
      memoryUsed,
      error
    };
    
  } catch (error) {
    return {
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: '',
      passed: false,
      executionTime: 0,
      memoryUsed: 0,
      error: error.message
    };
  }
};

// Mock function to simulate test results based on code quality
const simulateTestResult = (code, input, expectedOutput, language) => {
  // Basic heuristics to simulate code correctness
  const codeLength = code.length;
  const hasLoops = /for|while|forEach/.test(code);
  const hasConditionals = /if|else|switch/.test(code);
  const hasValidSyntax = !code.includes('syntax error');
  
  // Base probability based on code characteristics
  let successProbability = 0.3;
  
  // Increase probability for longer, more complex code
  if (codeLength > 100) successProbability += 0.2;
  if (hasLoops) successProbability += 0.15;
  if (hasConditionals) successProbability += 0.15;
  if (hasValidSyntax) successProbability += 0.2;
  
  // Language-specific adjustments
  switch (language) {
    case 'python':
      successProbability += 0.1; // Python is often easier
      break;
    case 'javascript':
      successProbability += 0.05;
      break;
    case 'cpp':
      successProbability -= 0.05; // C++ is often harder
      break;
  }
  
  // Check for common correct patterns
  if (code.includes('return') && !code.includes('undefined')) {
    successProbability += 0.1;
  }
  
  // Check for obvious mistakes
  if (code.includes('TODO') || code.includes('undefined') || code.length < 20) {
    successProbability -= 0.3;
  }
  
  return Math.random() < Math.min(successProbability, 0.9);
};

const generateMockOutput = (expectedOutput) => {
  // Generate plausible incorrect outputs
  const mockOutputs = [
    expectedOutput + '1',
    expectedOutput.slice(0, -1),
    'null',
    'undefined',
    '0',
    '',
    expectedOutput.toLowerCase(),
    expectedOutput.toUpperCase(),
    expectedOutput.split('').reverse().join('')
  ];
  
  return mockOutputs[Math.floor(Math.random() * mockOutputs.length)];
};

const generateMockError = (language) => {
  const errors = {
    javascript: [
      'ReferenceError: variable is not defined',
      'TypeError: Cannot read property of undefined',
      'SyntaxError: Unexpected token',
      'RangeError: Maximum call stack size exceeded'
    ],
    python: [
      'NameError: name \'variable\' is not defined',
      'IndexError: list index out of range',
      'TypeError: unsupported operand type(s)',
      'IndentationError: expected an indented block'
    ],
    cpp: [
      'error: \'variable\' was not declared in this scope',
      'error: no matching function for call',
      'error: invalid conversion',
      'Segmentation fault (core dumped)'
    ],
    java: [
      'error: cannot find symbol',
      'error: incompatible types',
      'Exception in thread "main" java.lang.NullPointerException',
      'error: class, interface, or enum expected'
    ]
  };
  
  const languageErrors = errors[language] || errors.javascript;
  return languageErrors[Math.floor(Math.random() * languageErrors.length)];
};

// For integration with real code execution services like Judge0
export const executeWithJudge0 = async (code, language, testCases, options = {}) => {
  // This would be the real implementation using Judge0 API
  // Example structure:
  
  /*
  const judge0Config = {
    'javascript': { language_id: 63 },
    'python': { language_id: 71 },
    'cpp': { language_id: 54 },
    'java': { language_id: 62 }
  };
  
  const results = [];
  
  for (const testCase of testCases) {
    const submission = {
      source_code: code,
      language_id: judge0Config[language].language_id,
      stdin: testCase.input,
      expected_output: testCase.expectedOutput,
      cpu_time_limit: options.timeLimit / 1000, // Convert to seconds
      memory_limit: options.memoryLimit * 1024 // Convert to KB
    };
    
    // Submit to Judge0 and get result
    const result = await submitToJudge0(submission);
    results.push({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: result.stdout,
      passed: result.status.id === 3, // Accepted
      executionTime: parseFloat(result.time) * 1000, // Convert to ms
      memoryUsed: parseInt(result.memory), // KB
      error: result.stderr || result.compile_output
    });
  }
  
  return results;
  */
  
  // For now, fall back to mock execution
  return executeCode(code, language, testCases, options);
};

// Utility function to validate code before execution
export const validateCode = (code, language) => {
  const errors = [];
  
  if (!code || code.trim().length === 0) {
    errors.push('Code cannot be empty');
  }
  
  if (code.length > 10000) {
    errors.push('Code is too long (max 10,000 characters)');
  }
  
  // Basic language-specific validation
  switch (language) {
    case 'javascript':
      if (!code.includes('function') && !code.includes('=>') && !code.includes('return')) {
        errors.push('JavaScript code should contain a function or return statement');
      }
      break;
    case 'python':
      if (!code.includes('def') && !code.includes('return')) {
        errors.push('Python code should contain a function definition');
      }
      break;
    case 'cpp':
      if (!code.includes('int main') && !code.includes('return')) {
        errors.push('C++ code should contain a main function');
      }
      break;
    case 'java':
      if (!code.includes('public class') || !code.includes('public static')) {
        errors.push('Java code should contain a public class and main method');
      }
      break;
  }
  
  // Check for potentially dangerous code
  const dangerousPatterns = [
    'exec(', 'eval(', 'import os', '#include <cstdlib>',
    'System.exit', 'Runtime.getRuntime', 'ProcessBuilder'
  ];
  
  for (const pattern of dangerousPatterns) {
    if (code.includes(pattern)) {
      errors.push(`Potentially dangerous code detected: ${pattern}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export default { executeCode, executeWithJudge0, validateCode };
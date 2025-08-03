// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

print('Starting MongoDB initialization...');

// Switch to codebattle database
db = db.getSiblingDB('codebattle');

// Create collections with indexes
print('Creating collections and indexes...');

// Users collection indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "statistics.rating": -1 });
db.users.createIndex({ "isOnline": 1 });

// Problems collection indexes
db.problems.createIndex({ "slug": 1 }, { unique: true });
db.problems.createIndex({ "difficulty": 1, "category": 1 });
db.problems.createIndex({ "tags": 1 });
db.problems.createIndex({ "isActive": 1 });

// Rooms collection indexes
db.rooms.createIndex({ "roomId": 1 }, { unique: true });
db.rooms.createIndex({ "status": 1, "type": 1 });
db.rooms.createIndex({ "participants.user": 1 });
db.rooms.createIndex({ "host": 1 });

// Matches collection indexes
db.matches.createIndex({ "matchId": 1 }, { unique: true });
db.matches.createIndex({ "participants.user": 1 });
db.matches.createIndex({ "battle.startedAt": -1 });
db.matches.createIndex({ "settings.difficulty": 1 });
db.matches.createIndex({ "problem": 1 });

print('Indexes created successfully.');

// Insert sample problems
print('Inserting sample problems...');

const sampleProblems = [
  {
    title: "Two Sum",
    slug: "two-sum",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    difficulty: "easy",
    category: "array",
    tags: ["array", "hash-table"],
    timeLimit: 2000,
    memoryLimit: 256,
    constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
      }
    ],
    testCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]", isHidden: false, weight: 1 },
      { input: "[3,2,4]\n6", expectedOutput: "[1,2]", isHidden: false, weight: 1 },
      { input: "[3,3]\n6", expectedOutput: "[0,1]", isHidden: true, weight: 1 }
    ],
    starterCode: {
      javascript: "function twoSum(nums, target) {\n    // Your code here\n}",
      python: "def two_sum(nums, target):\n    # Your code here\n    pass",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n    }\n};",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}"
    },
    hints: [
      { order: 1, content: "Try using a hash map to store the numbers you've seen." },
      { order: 2, content: "For each number, check if target - number exists in your hash map." }
    ],
    statistics: { totalSubmissions: 0, acceptedSubmissions: 0, acceptanceRate: 0 },
    isActive: true,
    isPremium: false
  },
  {
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    difficulty: "easy",
    category: "linked-list",
    tags: ["linked-list", "recursion"],
    timeLimit: 2000,
    memoryLimit: 256,
    constraints: "The number of nodes in the list is the range [0, 5000].\n-5000 <= Node.val <= 5000",
    examples: [
      {
        input: "head = [1,2,3,4,5]",
        output: "[5,4,3,2,1]",
        explanation: "The linked list is reversed."
      }
    ],
    testCases: [
      { input: "[1,2,3,4,5]", expectedOutput: "[5,4,3,2,1]", isHidden: false, weight: 1 },
      { input: "[1,2]", expectedOutput: "[2,1]", isHidden: false, weight: 1 },
      { input: "[]", expectedOutput: "[]", isHidden: true, weight: 1 }
    ],
    starterCode: {
      javascript: "function reverseList(head) {\n    // Your code here\n}",
      python: "def reverse_list(head):\n    # Your code here\n    pass",
      cpp: "struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Your code here\n    }\n};"
    },
    hints: [
      { order: 1, content: "Think about the iterative approach using three pointers." },
      { order: 2, content: "You can also solve this recursively." }
    ],
    statistics: { totalSubmissions: 0, acceptedSubmissions: 0, acceptanceRate: 0 },
    isActive: true,
    isPremium: false
  },
  {
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    description: "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\n\nA subarray is a contiguous part of an array.",
    difficulty: "medium",
    category: "dynamic-programming",
    tags: ["array", "divide-and-conquer", "dynamic-programming"],
    timeLimit: 2000,
    memoryLimit: 256,
    constraints: "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation: "[4,-1,2,1] has the largest sum = 6."
      }
    ],
    testCases: [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6", isHidden: false, weight: 1 },
      { input: "[1]", expectedOutput: "1", isHidden: false, weight: 1 },
      { input: "[5,4,-1,7,8]", expectedOutput: "23", isHidden: true, weight: 1 }
    ],
    starterCode: {
      javascript: "function maxSubArray(nums) {\n    // Your code here\n}",
      python: "def max_sub_array(nums):\n    # Your code here\n    pass",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Your code here\n    }\n};"
    },
    hints: [
      { order: 1, content: "Try using Kadane's algorithm." },
      { order: 2, content: "Keep track of the maximum sum ending at each position." }
    ],
    statistics: { totalSubmissions: 0, acceptedSubmissions: 0, acceptanceRate: 0 },
    isActive: true,
    isPremium: false
  }
];

db.problems.insertMany(sampleProblems);
print(`Inserted ${sampleProblems.length} sample problems.`);

print('MongoDB initialization completed successfully!');
print('Database: codebattle');
print('Collections created: users, problems, rooms, matches');
print('Sample data inserted: 3 coding problems');
import express from 'express';
import Problem from '../models/Problem.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import { 
  validateProblemCreation, 
  validateObjectId, 
  validatePagination,
  validateProblemFilters 
} from '../middleware/validation.js';

const router = express.Router();

// Get all problems (public)
router.get('/', validatePagination, validateProblemFilters, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      difficulty, 
      category, 
      tags, 
      search, 
      sort = 'newest' 
    } = req.query;
    
    const skip = (page - 1) * limit;
    
    let query = { isActive: true };
    
    // Apply filters
    if (difficulty) {
      query.difficulty = difficulty;
    }
    if (category) {
      query.category = category;
    }
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Determine sort order
    let sortOption = { createdAt: -1 }; // newest
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'difficulty':
        sortOption = { difficulty: 1, createdAt: -1 };
        break;
      case 'popularity':
        sortOption = { 'statistics.totalSubmissions': -1 };
        break;
      case 'acceptance':
        sortOption = { 'statistics.acceptanceRate': -1 };
        break;
    }
    
    const [problems, total] = await Promise.all([
      Problem.find(query)
        .select('title slug difficulty category tags statistics isPremium createdAt')
        .sort(sortOption)
        .limit(parseInt(limit))
        .skip(skip),
      Problem.countDocuments(query)
    ]);
    
    res.json({
      problems: problems.map(problem => problem.getPublicInfo()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ 
      message: 'Failed to get problems',
      error: error.message 
    });
  }
});

// Get problem by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const problem = await Problem.findOne({ slug, isActive: true })
      .populate('author', 'username')
      .populate('relatedProblems', 'title slug difficulty');
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    // Get battle version (without solutions)
    const problemData = problem.getBattleVersion();
    
    res.json({ 
      problem: {
        ...problemData,
        author: problem.author,
        relatedProblems: problem.relatedProblems,
        statistics: problem.statistics,
        acceptanceRatePercentage: problem.acceptanceRatePercentage,
        averageRating: problem.averageRating
      }
    });
    
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ 
      message: 'Failed to get problem',
      error: error.message 
    });
  }
});

// Get problems by category
router.get('/category/:category', validatePagination, async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const [problems, total] = await Promise.all([
      Problem.find({ category, isActive: true })
        .select('title slug difficulty statistics isPremium')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Problem.countDocuments({ category, isActive: true })
    ]);
    
    res.json({
      category,
      problems: problems.map(problem => problem.getPublicInfo()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get problems by category error:', error);
    res.status(500).json({ 
      message: 'Failed to get problems by category',
      error: error.message 
    });
  }
});

// Get random problem by difficulty
router.get('/random/:difficulty', async (req, res) => {
  try {
    const { difficulty } = req.params;
    const { exclude } = req.query; // Comma-separated IDs to exclude
    
    let excludeIds = [];
    if (exclude) {
      excludeIds = exclude.split(',');
    }
    
    const problem = await Problem.getRandomByDifficulty(difficulty, excludeIds);
    
    if (!problem) {
      return res.status(404).json({ 
        message: `No ${difficulty} problems available` 
      });
    }
    
    res.json({ 
      problem: problem.getBattleVersion() 
    });
    
  } catch (error) {
    console.error('Get random problem error:', error);
    res.status(500).json({ 
      message: 'Failed to get random problem',
      error: error.message 
    });
  }
});

// Search problems
router.get('/search/:query', validatePagination, async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20, difficulty, category } = req.query;
    const skip = (page - 1) * limit;
    
    const filters = {};
    if (difficulty) filters.difficulty = difficulty;
    if (category) filters.category = category;
    
    const problems = await Problem.search(query, filters);
    
    // Apply pagination
    const total = problems.length;
    const paginatedProblems = problems.slice(skip, skip + parseInt(limit));
    
    res.json({
      query,
      problems: paginatedProblems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Search problems error:', error);
    res.status(500).json({ 
      message: 'Failed to search problems',
      error: error.message 
    });
  }
});

// Get problem statistics
router.get('/:problemId/stats', validateObjectId('problemId'), async (req, res) => {
  try {
    const { problemId } = req.params;
    
    const problem = await Problem.findById(problemId)
      .select('title statistics acceptanceRatePercentage averageRating');
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    res.json({
      title: problem.title,
      statistics: problem.statistics,
      acceptanceRate: problem.acceptanceRatePercentage,
      averageRating: problem.averageRating
    });
    
  } catch (error) {
    console.error('Get problem stats error:', error);
    res.status(500).json({ 
      message: 'Failed to get problem statistics',
      error: error.message 
    });
  }
});

// Rate problem (protected)
router.post('/:problemId/rate', verifyToken, validateObjectId('problemId'), async (req, res) => {
  try {
    const { problemId } = req.params;
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Rating must be between 1 and 5' 
      });
    }
    
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    problem.addRating(rating);
    await problem.save();
    
    res.json({ 
      message: 'Rating submitted successfully',
      averageRating: problem.averageRating
    });
    
  } catch (error) {
    console.error('Rate problem error:', error);
    res.status(500).json({ 
      message: 'Failed to rate problem',
      error: error.message 
    });
  }
});

// ============= ADMIN ROUTES =============

// Create problem (admin only)
router.post('/', verifyToken, requireAdmin, validateProblemCreation, async (req, res) => {
  try {
    const problemData = {
      ...req.body,
      author: req.userId,
      slug: req.body.title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50)
    };
    
    // Ensure slug is unique
    let counter = 1;
    let baseSlug = problemData.slug;
    while (await Problem.findOne({ slug: problemData.slug })) {
      problemData.slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    const problem = new Problem(problemData);
    await problem.save();
    
    res.status(201).json({
      message: 'Problem created successfully',
      problem: problem.getPublicInfo()
    });
    
  } catch (error) {
    console.error('Create problem error:', error);
    res.status(500).json({ 
      message: 'Failed to create problem',
      error: error.message 
    });
  }
});

// Update problem (admin only)
router.put('/:problemId', verifyToken, requireAdmin, validateObjectId('problemId'), async (req, res) => {
  try {
    const { problemId } = req.params;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.statistics;
    delete updates.author;
    delete updates.createdAt;
    delete updates.updatedAt;
    
    const problem = await Problem.findByIdAndUpdate(
      problemId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    res.json({
      message: 'Problem updated successfully',
      problem: problem.getPublicInfo()
    });
    
  } catch (error) {
    console.error('Update problem error:', error);
    res.status(500).json({ 
      message: 'Failed to update problem',
      error: error.message 
    });
  }
});

// Delete problem (admin only)
router.delete('/:problemId', verifyToken, requireAdmin, validateObjectId('problemId'), async (req, res) => {
  try {
    const { problemId } = req.params;
    
    const problem = await Problem.findByIdAndUpdate(
      problemId,
      { isActive: false },
      { new: true }
    );
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    
    res.json({ message: 'Problem deactivated successfully' });
    
  } catch (error) {
    console.error('Delete problem error:', error);
    res.status(500).json({ 
      message: 'Failed to delete problem',
      error: error.message 
    });
  }
});

// Get all problems (admin only)
router.get('/admin/all', verifyToken, requireAdmin, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, includeInactive = false } = req.query;
    const skip = (page - 1) * limit;
    
    const query = includeInactive === 'true' ? {} : { isActive: true };
    
    const [problems, total] = await Promise.all([
      Problem.find(query)
        .populate('author', 'username')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Problem.countDocuments(query)
    ]);
    
    res.json({
      problems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get all problems (admin) error:', error);
    res.status(500).json({ 
      message: 'Failed to get problems',
      error: error.message 
    });
  }
});

// Get problem categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Problem.distinct('category', { isActive: true });
    
    // Get count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Problem.countDocuments({ 
          category, 
          isActive: true 
        });
        return { category, count };
      })
    );
    
    res.json({ categories: categoriesWithCounts });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      message: 'Failed to get categories',
      error: error.message 
    });
  }
});

// Get popular tags
router.get('/meta/tags', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const pipeline = [
      { $match: { isActive: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ];
    
    const tags = await Problem.aggregate(pipeline);
    
    res.json({ tags });
    
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ 
      message: 'Failed to get tags',
      error: error.message 
    });
  }
});

export default router;
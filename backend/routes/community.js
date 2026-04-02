const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

// GET /api/community/forum - Get forum discussions
router.get('/forum', async (req, res) => {
  try {
    const { category = 'all', limit = 20, sort = 'latest' } = req.query;
    
    let query = `
      SELECT 
        p.id, p.title, p.content, p.category, p.created_at, p.updated_at,
        p.author_id, p.views, p.likes, p.replies_count,
        u.username as author_name, u.avatar_url
      FROM forum_posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.is_active = 1
    `;
    
    const params = [];
    
    if (category !== 'all') {
      query += ' AND p.category = ?';
      params.push(category);
    }
    
    // Add sorting
    switch (sort) {
      case 'popular':
        query += ' ORDER BY p.likes DESC, p.views DESC';
        break;
      case 'trending':
        query += ' ORDER BY (p.likes + p.replies_count * 2) DESC';
        break;
      default:
        query += ' ORDER BY p.updated_at DESC';
    }
    
    query += ' LIMIT ?';
    params.push(limit);
    
    const posts = await executeQuery(query, params);
    
    res.json({
      posts: posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content?.substring(0, 300) + (post.content?.length > 300 ? '...' : ''),
        full_content: post.content,
        category: post.category,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: {
          id: post.author_id,
          name: post.author_name,
          avatar: post.avatar_url
        },
        stats: {
          views: post.views,
          likes: post.likes,
          replies: post.replies_count
        }
      })),
      total_count: posts.length,
      categories: await getForumCategories()
    });
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    res.status(500).json({ error: 'Failed to fetch forum posts' });
  }
});

// GET /api/community/forum/:postId - Get specific forum post with replies
router.get('/forum/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Get post details
    const postQuery = `
      SELECT 
        p.id, p.title, p.content, p.category, p.created_at, p.updated_at,
        p.author_id, p.views, p.likes, p.replies_count,
        u.username as author_name, u.avatar_url
      FROM forum_posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id = ? AND p.is_active = 1
    `;
    
    const [post] = await executeQuery(postQuery, [postId]);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Increment view count
    await executeQuery(
      'UPDATE forum_posts SET views = views + 1 WHERE id = ?',
      [postId]
    );
    
    // Get replies
    const repliesQuery = `
      SELECT 
        r.id, r.content, r.created_at, r.updated_at,
        r.author_id, r.likes,
        u.username as author_name, u.avatar_url
      FROM forum_replies r
      LEFT JOIN users u ON r.author_id = u.id
      WHERE r.post_id = ? AND r.is_active = 1
      ORDER BY r.created_at ASC
    `;
    
    const replies = await executeQuery(repliesQuery, [postId]);
    
    res.json({
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        category: post.category,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: {
          id: post.author_id,
          name: post.author_name,
          avatar: post.avatar_url
        },
        stats: {
          views: post.views + 1, // Include the increment
          likes: post.likes,
          replies: post.replies_count
        }
      },
      replies: replies.map(reply => ({
        id: reply.id,
        content: reply.content,
        created_at: reply.created_at,
        updated_at: reply.updated_at,
        author: {
          id: reply.author_id,
          name: reply.author_name,
          avatar: reply.avatar_url
        },
        likes: reply.likes
      }))
    });
  } catch (error) {
    console.error('Error fetching forum post:', error);
    res.status(500).json({ error: 'Failed to fetch forum post' });
  }
});

// POST /api/community/forum - Create new forum post
router.post('/forum', async (req, res) => {
  try {
    const { title, content, category, authorId } = req.body;
    
    if (!title || !content || !category || !authorId) {
      return res.status(400).json({ 
        error: 'Title, content, category, and author ID are required' 
      });
    }
    
    const query = `
      INSERT INTO forum_posts (title, content, category, author_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    
    const result = await executeQuery(query, [title, content, category, authorId]);
    
    res.json({
      post_id: result.insertId,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating forum post:', error);
    res.status(500).json({ error: 'Failed to create forum post' });
  }
});

// POST /api/community/forum/:postId/reply - Reply to forum post
router.post('/forum/:postId/reply', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, authorId } = req.body;
    
    if (!content || !authorId) {
      return res.status(400).json({ 
        error: 'Content and author ID are required' 
      });
    }
    
    // Check if post exists
    const postCheck = await executeQuery('SELECT id FROM forum_posts WHERE id = ?', [postId]);
    if (postCheck.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const query = `
      INSERT INTO forum_replies (post_id, content, author_id, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW())
    `;
    
    const result = await executeQuery(query, [postId, content, authorId]);
    
    // Update replies count
    await executeQuery(
      'UPDATE forum_posts SET replies_count = replies_count + 1, updated_at = NOW() WHERE id = ?',
      [postId]
    );
    
    res.json({
      reply_id: result.insertId,
      message: 'Reply posted successfully'
    });
  } catch (error) {
    console.error('Error posting reply:', error);
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

// GET /api/community/polls - Get community polls
router.get('/polls', async (req, res) => {
  try {
    const { limit = 10, status = 'active' } = req.query;
    
    let query = `
      SELECT 
        p.id, p.question, p.description, p.options, p.created_at, p.expires_at,
        p.author_id, p.total_votes, p.is_active,
        u.username as author_name
      FROM community_polls p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.is_active = 1
    `;
    
    const params = [];
    
    if (status === 'active') {
      query += ' AND (p.expires_at IS NULL OR p.expires_at > NOW())';
    } else if (status === 'expired') {
      query += ' AND p.expires_at IS NOT NULL AND p.expires_at <= NOW()';
    }
    
    query += ' ORDER BY p.created_at DESC LIMIT ?';
    params.push(limit);
    
    const polls = await executeQuery(query, params);
    
    // Get poll results for each poll
    const pollsWithResults = await Promise.all(polls.map(async (poll) => {
      const resultsQuery = `
        SELECT option_index, COUNT(*) as vote_count
        FROM poll_votes 
        WHERE poll_id = ?
        GROUP BY option_index
      `;
      
      const results = await executeQuery(resultsQuery, [poll.id]);
      
      const options = JSON.parse(poll.options);
      const voteResults = {};
      
      results.forEach(result => {
        voteResults[result.option_index] = result.vote_count;
      });
      
      // Add vote counts to options
      const optionsWithVotes = options.map((option, index) => ({
        text: option,
        votes: voteResults[index] || 0,
        percentage: poll.total_votes > 0 ? ((voteResults[index] || 0) / poll.total_votes * 100) : 0
      }));
      
      return {
        id: poll.id,
        question: poll.question,
        description: poll.description,
        options: optionsWithVotes,
        created_at: poll.created_at,
        expires_at: poll.expires_at,
        author: {
          id: poll.author_id,
          name: poll.author_name
        },
        total_votes: poll.total_votes,
        is_expired: poll.expires_at ? new Date(poll.expires_at) <= new Date() : false
      };
    }));
    
    res.json({
      polls: pollsWithResults,
      total_count: pollsWithResults.length
    });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

// POST /api/community/polls/:pollId/vote - Vote on a poll
router.post('/polls/:pollId/vote', async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIndex, userId } = req.body;
    
    if (optionIndex === undefined || !userId) {
      return res.status(400).json({ 
        error: 'Option index and user ID are required' 
      });
    }
    
    // Check if poll exists and is active
    const pollCheck = await executeQuery(
      'SELECT id, options, expires_at FROM community_polls WHERE id = ? AND is_active = 1',
      [pollId]
    );
    
    if (pollCheck.length === 0) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    const poll = pollCheck[0];
    
    // Check if poll is expired
    if (poll.expires_at && new Date(poll.expires_at) <= new Date()) {
      return res.status(400).json({ error: 'Poll has expired' });
    }
    
    // Check if user has already voted
    const existingVote = await executeQuery(
      'SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?',
      [pollId, userId]
    );
    
    if (existingVote.length > 0) {
      return res.status(400).json({ error: 'User has already voted on this poll' });
    }
    
    // Validate option index
    const options = JSON.parse(poll.options);
    if (optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }
    
    // Record vote
    const voteQuery = `
      INSERT INTO poll_votes (poll_id, user_id, option_index, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    
    await executeQuery(voteQuery, [pollId, userId, optionIndex]);
    
    // Update total votes count
    await executeQuery(
      'UPDATE community_polls SET total_votes = total_votes + 1 WHERE id = ?',
      [pollId]
    );
    
    res.json({
      message: 'Vote recorded successfully',
      option_text: options[optionIndex]
    });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// GET /api/community/tutorials - Get educational tutorials
router.get('/tutorials', async (req, res) => {
  try {
    const { category = 'all', level = 'all', limit = 20 } = req.query;
    
    let query = `
      SELECT 
        t.id, t.title, t.description, t.content, t.category, t.difficulty_level,
        t.created_at, t.updated_at, t.views, t.likes, t.author_id,
        u.username as author_name, u.avatar_url
      FROM tutorials t
      LEFT JOIN users u ON t.author_id = u.id
      WHERE t.is_published = 1
    `;
    
    const params = [];
    
    if (category !== 'all') {
      query += ' AND t.category = ?';
      params.push(category);
    }
    
    if (level !== 'all') {
      query += ' AND t.difficulty_level = ?';
      params.push(level);
    }
    
    query += ' ORDER BY t.updated_at DESC LIMIT ?';
    params.push(limit);
    
    const tutorials = await executeQuery(query, params);
    
    res.json({
      tutorials: tutorials.map(tutorial => ({
        id: tutorial.id,
        title: tutorial.title,
        description: tutorial.description,
        content: tutorial.content?.substring(0, 500) + (tutorial.content?.length > 500 ? '...' : ''),
        full_content: tutorial.content,
        category: tutorial.category,
        difficulty_level: tutorial.difficulty_level,
        created_at: tutorial.created_at,
        updated_at: tutorial.updated_at,
        author: {
          id: tutorial.author_id,
          name: tutorial.author_name,
          avatar: tutorial.avatar_url
        },
        stats: {
          views: tutorial.views,
          likes: tutorial.likes
        }
      })),
      total_count: tutorials.length,
      categories: await getTutorialCategories(),
      difficulty_levels: ['Beginner', 'Intermediate', 'Advanced']
    });
  } catch (error) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({ error: 'Failed to fetch tutorials' });
  }
});

// GET /api/community/tutorials/:tutorialId - Get specific tutorial
router.get('/tutorials/:tutorialId', async (req, res) => {
  try {
    const { tutorialId } = req.params;
    
    const query = `
      SELECT 
        t.id, t.title, t.description, t.content, t.category, t.difficulty_level,
        t.created_at, t.updated_at, t.views, t.likes, t.author_id,
        u.username as author_name, u.avatar_url
      FROM tutorials t
      LEFT JOIN users u ON t.author_id = u.id
      WHERE t.id = ? AND t.is_published = 1
    `;
    
    const [tutorial] = await executeQuery(query, [tutorialId]);
    
    if (!tutorial) {
      return res.status(404).json({ error: 'Tutorial not found' });
    }
    
    // Increment view count
    await executeQuery(
      'UPDATE tutorials SET views = views + 1 WHERE id = ?',
      [tutorialId]
    );
    
    res.json({
      tutorial: {
        id: tutorial.id,
        title: tutorial.title,
        description: tutorial.description,
        content: tutorial.content,
        category: tutorial.category,
        difficulty_level: tutorial.difficulty_level,
        created_at: tutorial.created_at,
        updated_at: tutorial.updated_at,
        author: {
          id: tutorial.author_id,
          name: tutorial.author_name,
          avatar: tutorial.avatar_url
        },
        stats: {
          views: tutorial.views + 1,
          likes: tutorial.likes
        }
      }
    });
  } catch (error) {
    console.error('Error fetching tutorial:', error);
    res.status(500).json({ error: 'Failed to fetch tutorial' });
  }
});

// GET /api/community/sentiment - Get community sentiment analysis
router.get('/sentiment', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const days = getDaysFromPeriod(period);
    
    // Analyze sentiment from forum posts and comments
    const sentimentQuery = `
      SELECT 
        DATE(created_at) as date,
        AVG(sentiment_score) as avg_sentiment,
        COUNT(*) as post_count
      FROM forum_posts 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND sentiment_score IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    
    const sentimentData = await executeQuery(sentimentQuery, [days]);
    
    // Get trending topics
    const trendingQuery = `
      SELECT 
        category,
        COUNT(*) as post_count,
        AVG(sentiment_score) as avg_sentiment
      FROM forum_posts 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND sentiment_score IS NOT NULL
      GROUP BY category
      ORDER BY post_count DESC
      LIMIT 10
    `;
    
    const trendingTopics = await executeQuery(trendingQuery, [days]);
    
    // Calculate overall community sentiment
    const overallSentiment = sentimentData.length > 0 ? 
      sentimentData.reduce((sum, day) => sum + day.avg_sentiment, 0) / sentimentData.length : 0;
    
    res.json({
      period,
      overall_sentiment: overallSentiment,
      sentiment_label: getSentimentLabel(overallSentiment),
      daily_sentiment: sentimentData.map(day => ({
        date: day.date,
        avg_sentiment: parseFloat(day.avg_sentiment),
        post_count: day.post_count,
        sentiment_label: getSentimentLabel(day.avg_sentiment)
      })),
      trending_topics: trendingTopics.map(topic => ({
        category: topic.category,
        post_count: topic.post_count,
        avg_sentiment: parseFloat(topic.avg_sentiment),
        sentiment_label: getSentimentLabel(topic.avg_sentiment)
      }))
    });
  } catch (error) {
    console.error('Error analyzing community sentiment:', error);
    res.status(500).json({ error: 'Failed to analyze community sentiment' });
  }
});

// Helper functions
function getDaysFromPeriod(period) {
  const periodMap = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  return periodMap[period] || 7;
}

function getSentimentLabel(score) {
  if (score > 0.3) return 'Positive';
  if (score < -0.3) return 'Negative';
  return 'Neutral';
}

async function getForumCategories() {
  try {
    const query = `
      SELECT category, COUNT(*) as post_count
      FROM forum_posts 
      WHERE is_active = 1
      GROUP BY category
      ORDER BY post_count DESC
    `;
    
    const categories = await executeQuery(query);
    
    return categories.map(cat => ({
      name: cat.category,
      post_count: cat.post_count
    }));
  } catch (error) {
    console.error('Error fetching forum categories:', error);
    return [];
  }
}

async function getTutorialCategories() {
  try {
    const query = `
      SELECT category, COUNT(*) as tutorial_count
      FROM tutorials 
      WHERE is_published = 1
      GROUP BY category
      ORDER BY tutorial_count DESC
    `;
    
    const categories = await executeQuery(query);
    
    return categories.map(cat => ({
      name: cat.category,
      tutorial_count: cat.tutorial_count
    }));
  } catch (error) {
    console.error('Error fetching tutorial categories:', error);
    return [];
  }
}

module.exports = router;

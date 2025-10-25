/*
  # Seed Initial Daily Questions
  
  1. Purpose
    - Add starter questions to the daily_question_pool table
    - Ensures users have questions to answer immediately
    - Covers various personality dimensions and categories
    
  2. Categories Used
    - Values and beliefs
    - Memories and experiences
    - Daily life and habits
    - Interests and passions
    - Goals and aspirations
    
  3. Notes
    - Questions are designed to be thought-provoking and personal
    - Each question helps build a richer personality profile
    - Questions are suitable for all users regardless of background
*/

-- Insert starter questions into daily_question_pool
INSERT INTO daily_question_pool (
  question_text, 
  category_id, 
  difficulty_level, 
  requires_deep_thought,
  day_range_start,
  day_range_end,
  is_active
) VALUES
  -- Get first active category for seeding
  (
    'What is the first thing that brings you joy when you wake up?',
    (SELECT id FROM question_categories WHERE is_active = true ORDER BY category_order LIMIT 1),
    1,
    false,
    1,
    365,
    true
  ),
  (
    'Describe a moment from your childhood that still makes you smile.',
    (SELECT id FROM question_categories WHERE category_name = 'childhood_memories' AND is_active = true LIMIT 1),
    2,
    true,
    1,
    365,
    true
  ),
  (
    'What is your morning routine like? Walk me through it.',
    (SELECT id FROM question_categories WHERE category_name = 'daily_life' AND is_active = true LIMIT 1),
    1,
    false,
    1,
    365,
    true
  ),
  (
    'If you could master any skill instantly, what would it be and why?',
    (SELECT id FROM question_categories WHERE category_name = 'interests_passions' AND is_active = true LIMIT 1),
    2,
    true,
    1,
    365,
    true
  ),
  (
    'What does a perfect evening look like for you?',
    (SELECT id FROM question_categories WHERE is_active = true ORDER BY category_order LIMIT 1),
    1,
    false,
    1,
    365,
    true
  ),
  (
    'Tell me about a book, movie, or song that changed your perspective on life.',
    (SELECT id FROM question_categories WHERE category_name = 'memories_experiences' AND is_active = true LIMIT 1),
    2,
    true,
    1,
    365,
    true
  ),
  (
    'What are three things you are grateful for today?',
    (SELECT id FROM question_categories WHERE is_active = true ORDER BY category_order LIMIT 1),
    1,
    false,
    1,
    365,
    true
  ),
  (
    'Describe your ideal weekend. What would you do?',
    (SELECT id FROM question_categories WHERE category_name = 'daily_life' AND is_active = true LIMIT 1),
    1,
    false,
    1,
    365,
    true
  ),
  (
    'What is something you believe that most people disagree with?',
    (SELECT id FROM question_categories WHERE is_active = true ORDER BY category_order LIMIT 1),
    3,
    true,
    1,
    365,
    true
  ),
  (
    'If you could have dinner with anyone, living or dead, who would it be and what would you ask them?',
    (SELECT id FROM question_categories WHERE category_name = 'interests_passions' AND is_active = true LIMIT 1),
    2,
    true,
    1,
    365,
    true
  ),
  (
    'What is your favorite way to relax after a long day?',
    (SELECT id FROM question_categories WHERE category_name = 'health_wellness' AND is_active = true LIMIT 1),
    1,
    false,
    1,
    365,
    true
  ),
  (
    'Describe a place that feels like home to you, even if it is not your house.',
    (SELECT id FROM question_categories WHERE category_name = 'memories_experiences' AND is_active = true LIMIT 1),
    2,
    true,
    1,
    365,
    true
  ),
  (
    'What is one goal you have for the next year?',
    (SELECT id FROM question_categories WHERE is_active = true ORDER BY category_order LIMIT 1),
    2,
    true,
    1,
    365,
    true
  ),
  (
    'Tell me about a time when you felt truly proud of yourself.',
    (SELECT id FROM question_categories WHERE category_name = 'memories_experiences' AND is_active = true LIMIT 1),
    2,
    true,
    1,
    365,
    true
  ),
  (
    'What is your favorite season and why?',
    (SELECT id FROM question_categories WHERE is_active = true ORDER BY category_order LIMIT 1),
    1,
    false,
    1,
    365,
    true
  ),
  (
    'How do you like to celebrate special occasions?',
    (SELECT id FROM question_categories WHERE category_name = 'daily_life' AND is_active = true LIMIT 1),
    1,
    false,
    1,
    365,
    true
  ),
  (
    'What is a hobby or activity that helps you lose track of time?',
    (SELECT id FROM question_categories WHERE category_name = 'interests_passions' AND is_active = true LIMIT 1),
    2,
    false,
    1,
    365,
    true
  ),
  (
    'Describe your ideal work environment.',
    (SELECT id FROM question_categories WHERE is_active = true ORDER BY category_order LIMIT 1),
    2,
    false,
    1,
    365,
    true
  ),
  (
    'What is one thing you wish you had more time for?',
    (SELECT id FROM question_categories WHERE is_active = true ORDER BY category_order LIMIT 1),
    2,
    true,
    1,
    365,
    true
  ),
  (
    'Tell me about a tradition that is important to you.',
    (SELECT id FROM question_categories WHERE category_name = 'memories_experiences' AND is_active = true LIMIT 1),
    2,
    true,
    1,
    365,
    true
  )
ON CONFLICT DO NOTHING;
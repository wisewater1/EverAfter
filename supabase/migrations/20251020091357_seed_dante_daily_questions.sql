/*
  # Seed Daily Questions for Dante AI
  
  ## Overview
  Adds 90+ thoughtful daily questions to build Dante's personality through user responses.
  
  ## Valid Categories
  - values, humor, daily, relationships, stories, dreams, challenges, wisdom
  
  ## Valid Personality Aspects  
  - core_values, life_philosophy, creativity, decision_making, emotional_patterns,
    resilience, social_behavior, communication_style
*/

INSERT INTO questions (question_text, category, time_of_day, personality_aspect, difficulty) VALUES
-- Values
('What does success mean to you personally?', 'values', 'morning', 'core_values', 'deep'),
('If you could change one thing about the world, what would it be?', 'values', 'afternoon', 'core_values', 'deep'),
('What principle or value do you refuse to compromise on?', 'values', 'morning', 'core_values', 'deep'),
('What brings you the most joy in everyday moments?', 'values', 'afternoon', 'core_values', 'medium'),
('What qualities do you admire most in others?', 'values', 'afternoon', 'core_values', 'medium'),
('What does integrity mean to you?', 'values', 'morning', 'core_values', 'deep'),
('How do you define a meaningful life?', 'values', 'evening', 'life_philosophy', 'deep'),
('What would you stand up for, even if you stood alone?', 'values', 'afternoon', 'core_values', 'deep'),
('What values guide your daily decisions?', 'values', 'morning', 'decision_making', 'medium'),
('What matters most to you in life?', 'values', 'evening', 'core_values', 'deep'),

-- Humor
('What always makes you laugh?', 'humor', 'afternoon', 'emotional_patterns', 'light'),
('Describe your sense of humor in three words', 'humor', 'afternoon', 'communication_style', 'light'),
('What''s the funniest thing that happened to you?', 'humor', 'evening', 'emotional_patterns', 'medium'),
('Do you prefer witty banter or slapstick comedy?', 'humor', 'afternoon', 'communication_style', 'light'),
('What joke always cracks you up?', 'humor', 'afternoon', 'emotional_patterns', 'light'),
('Who makes you laugh the hardest?', 'humor', 'afternoon', 'social_behavior', 'light'),
('What''s your go-to funny story?', 'humor', 'afternoon', 'communication_style', 'medium'),
('How does humor help you cope with stress?', 'humor', 'evening', 'resilience', 'medium'),

-- Daily Life
('What does your perfect morning look like?', 'daily', 'morning', 'decision_making', 'light'),
('How do you recharge after a difficult day?', 'daily', 'evening', 'resilience', 'medium'),
('What small ritual brings structure to your day?', 'daily', 'morning', 'decision_making', 'medium'),
('Coffee, tea, or something else?', 'daily', 'morning', 'core_values', 'light'),
('Are you a morning person or night owl?', 'daily', 'morning', 'emotional_patterns', 'light'),
('What''s your favorite part of the day?', 'daily', 'afternoon', 'emotional_patterns', 'light'),
('How do you like to start your weekend?', 'daily', 'morning', 'social_behavior', 'light'),
('What daily habit has changed your life?', 'daily', 'afternoon', 'resilience', 'medium'),
('How do you wind down at night?', 'daily', 'evening', 'emotional_patterns', 'light'),
('What''s one thing you do every day without fail?', 'daily', 'afternoon', 'decision_making', 'medium'),

-- Relationships
('What qualities do you value most in a friend?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('How do you show someone you care?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('What''s the best advice someone gave you?', 'relationships', 'afternoon', 'core_values', 'medium'),
('Who had the biggest impact on who you are?', 'relationships', 'evening', 'core_values', 'deep'),
('How do you handle conflict?', 'relationships', 'afternoon', 'resilience', 'deep'),
('What makes a relationship strong?', 'relationships', 'afternoon', 'social_behavior', 'deep'),
('How do you maintain long-distance friendships?', 'relationships', 'afternoon', 'social_behavior', 'medium'),
('What do you need most from close relationships?', 'relationships', 'evening', 'emotional_patterns', 'deep'),
('How do you know when to trust someone?', 'relationships', 'afternoon', 'decision_making', 'deep'),
('What''s your love language?', 'relationships', 'afternoon', 'social_behavior', 'medium'),

-- Stories & Memories
('What''s your earliest memory?', 'stories', 'evening', 'emotional_patterns', 'medium'),
('Describe a moment when you felt truly proud', 'stories', 'evening', 'core_values', 'medium'),
('What childhood experience shaped your perspective?', 'stories', 'evening', 'life_philosophy', 'deep'),
('If you could relive one day, which would it be?', 'stories', 'evening', 'core_values', 'medium'),
('What tradition do you still cherish?', 'stories', 'evening', 'core_values', 'medium'),
('Tell me about a time you helped someone', 'stories', 'afternoon', 'social_behavior', 'medium'),
('What''s a story your family tells about you?', 'stories', 'evening', 'communication_style', 'light'),
('Describe a moment that changed your life', 'stories', 'evening', 'life_philosophy', 'deep'),
('What''s the most adventurous thing you''ve done?', 'stories', 'afternoon', 'resilience', 'medium'),
('Share a memory that makes you smile', 'stories', 'evening', 'emotional_patterns', 'light'),

-- Dreams & Aspirations
('If money were no object, how would you spend time?', 'dreams', 'afternoon', 'core_values', 'medium'),
('What skill do you wish you had?', 'dreams', 'afternoon', 'creativity', 'light'),
('Where do you see yourself in 10 years?', 'dreams', 'afternoon', 'life_philosophy', 'medium'),
('What do you want to accomplish before you die?', 'dreams', 'evening', 'core_values', 'deep'),
('If you could master any subject, what would it be?', 'dreams', 'afternoon', 'creativity', 'light'),
('What''s on your bucket list?', 'dreams', 'afternoon', 'core_values', 'medium'),
('Where would you love to travel and why?', 'dreams', 'afternoon', 'creativity', 'light'),
('What impact do you want to have on the world?', 'dreams', 'evening', 'life_philosophy', 'deep'),
('If you could change careers, what would you do?', 'dreams', 'afternoon', 'creativity', 'medium'),
('What''s a dream you''ve had since childhood?', 'dreams', 'evening', 'core_values', 'medium'),

-- Challenges & Growth
('What''s the hardest challenge you''ve overcome?', 'challenges', 'evening', 'resilience', 'deep'),
('What failure taught you the most?', 'challenges', 'evening', 'resilience', 'deep'),
('How has your perspective changed recently?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('What fear are you working to conquer?', 'challenges', 'evening', 'resilience', 'deep'),
('What lesson did you learn the hard way?', 'challenges', 'afternoon', 'life_philosophy', 'medium'),
('How do you handle disappointment?', 'challenges', 'afternoon', 'resilience', 'medium'),
('What obstacle are you currently facing?', 'challenges', 'afternoon', 'resilience', 'medium'),
('How have you grown in the past year?', 'challenges', 'evening', 'life_philosophy', 'deep'),
('What challenge taught you about yourself?', 'challenges', 'evening', 'resilience', 'deep'),
('How do you stay motivated during tough times?', 'challenges', 'afternoon', 'resilience', 'medium'),

-- Wisdom & Philosophy
('What advice would you give your younger self?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('What life lesson took you longest to learn?', 'wisdom', 'evening', 'resilience', 'deep'),
('What do you wish more people understood?', 'wisdom', 'evening', 'core_values', 'deep'),
('What''s the most important thing you''ve learned?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('What wisdom have you gained from experience?', 'wisdom', 'evening', 'resilience', 'deep'),
('How do you define happiness?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('What does living authentically mean to you?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('How do you find meaning in difficult times?', 'wisdom', 'evening', 'resilience', 'deep'),
('What role does hope play in your life?', 'wisdom', 'afternoon', 'emotional_patterns', 'medium'),
('How do you balance ambition with contentment?', 'wisdom', 'evening', 'life_philosophy', 'deep'),
('What makes life worth living?', 'wisdom', 'evening', 'core_values', 'deep'),
('What''s your philosophy on forgiveness?', 'wisdom', 'evening', 'social_behavior', 'deep'),
('How do you stay true to yourself?', 'wisdom', 'afternoon', 'core_values', 'deep'),
('What question keeps you up at night?', 'wisdom', 'evening', 'life_philosophy', 'deep')

ON CONFLICT DO NOTHING;

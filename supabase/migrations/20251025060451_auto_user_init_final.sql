/*
  # Auto User Initialization System - Final
  
  Automatically initializes new users with profile, St. Raphael, and welcome activity.
*/

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.saints_subscriptions (user_id, saint_id, is_active, activated_at)
  VALUES (NEW.id, 'raphael', true, NOW())
  ON CONFLICT (user_id, saint_id) DO NOTHING;

  INSERT INTO public.user_daily_progress (user_id, current_day, total_responses, streak_days, started_at, updated_at)
  VALUES (NEW.id, 1, 0, 0, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.saint_activities (user_id, saint_id, action, description, category, impact, status, created_at)
  VALUES (NEW.id, 'raphael', 'Welcome to EverAfter', 'St. Raphael has been activated and is ready to assist you.', 'support', 'high', 'completed', NOW());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Initialize existing users
DO $$
DECLARE user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
    VALUES (user_record.id, user_record.email, COALESCE(user_record.raw_user_meta_data->>'display_name', split_part(user_record.email, '@', 1)), NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.saints_subscriptions (user_id, saint_id, is_active, activated_at)
    VALUES (user_record.id, 'raphael', true, NOW())
    ON CONFLICT (user_id, saint_id) DO NOTHING;

    INSERT INTO public.user_daily_progress (user_id, current_day, total_responses, streak_days, started_at, updated_at)
    VALUES (user_record.id, 1, 0, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END;
$$;
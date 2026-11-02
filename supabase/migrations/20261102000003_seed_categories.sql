-- ====================================================================
-- PULSE Finance Tracker Module - Default System Categories Seed
-- Migration: 20261102000003_seed_categories.sql
-- ====================================================================

-- Insert Default System Expense Categories
INSERT INTO public.categories (name, category_type, icon, color, is_system, is_active)
VALUES
    ('Food', 'expense', 'utensils', '#EF4444', TRUE, TRUE),
    ('Transportation', 'expense', 'car', '#F97316', TRUE, TRUE),
    ('Shopping', 'expense', 'shopping-bag', '#F59E0B', TRUE, TRUE),
    ('Entertainment', 'expense', 'film', '#84CC16', TRUE, TRUE),
    ('Education', 'expense', 'graduation-cap', '#10B981', TRUE, TRUE),
    ('Healthcare', 'expense', 'activity', '#06B6D4', TRUE, TRUE),
    ('Housing', 'expense', 'home', '#3B82F6', TRUE, TRUE),
    ('Utilities', 'expense', 'zap', '#6366F1', TRUE, TRUE),
    ('Subscriptions', 'expense', 'calendar-repeat', '#8B5CF6', TRUE, TRUE),
    ('Personal Care', 'expense', 'smile', '#EC4899', TRUE, TRUE),
    ('Travel', 'expense', 'plane', '#14B8A6', TRUE, TRUE),
    ('Other Expense', 'expense', 'more-horizontal', '#6B7280', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Insert Default System Income Categories
INSERT INTO public.categories (name, category_type, icon, color, is_system, is_active)
VALUES
    ('Salary', 'income', 'briefcase', '#10B981', TRUE, TRUE),
    ('Freelancing', 'income', 'laptop', '#059669', TRUE, TRUE),
    ('Business', 'income', 'trending-up', '#047857', TRUE, TRUE),
    ('Allowance', 'income', 'pocket', '#34D399', TRUE, TRUE),
    ('Interest', 'income', 'percent', '#6EE7B7', TRUE, TRUE),
    ('Gifts', 'income', 'gift', '#A7F3D0', TRUE, TRUE),
    ('Other Income', 'income', 'plus-circle', '#6B7280', TRUE, TRUE)
ON CONFLICT DO NOTHING;


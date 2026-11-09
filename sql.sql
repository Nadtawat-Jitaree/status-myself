-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  fname text,
  lname text,
  tel text,
  address text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.note_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  note_type text DEFAULT 'normal'::text,
  pic text,
  is_shared boolean DEFAULT false,
  share_token text UNIQUE,
  year integer,
  semester integer,
  CONSTRAINT note_categories_pkey PRIMARY KEY (id),
  CONSTRAINT note_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL DEFAULT '42536a99-578d-4294-b972-c83a3a63411b'::uuid,
  title text NOT NULL,
  content text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  status text DEFAULT 'ทั่วไป'::text,
  file_path text,
  is_pinned boolean DEFAULT false,
  is_shared boolean DEFAULT false,
  share_token text UNIQUE,
  CONSTRAINT notes_pkey PRIMARY KEY (id),
  CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT notes_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.note_categories(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'planning'::text,
  start_date timestamp with time zone,
  due_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  target_label text,
  target_count integer,
  target_current integer DEFAULT 0,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo'::text,
  priority text DEFAULT 'medium'::text,
  order_index integer DEFAULT 0,
  due_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
CREATE TABLE public.daily_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  summary text,
  mood character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_logs_pkey PRIMARY KEY (id),
  CONSTRAINT daily_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.log_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  daily_log_id uuid,
  user_id uuid NOT NULL,
  date date NOT NULL,
  title text NOT NULL,
  description text,
  category character varying,
  status character varying DEFAULT 'todo'::character varying,
  priority character varying DEFAULT 'medium'::character varying,
  start_time time without time zone,
  end_time time without time zone,
  tags ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT log_items_pkey PRIMARY KEY (id),
  CONSTRAINT log_items_daily_log_id_fkey FOREIGN KEY (daily_log_id) REFERENCES public.daily_logs(id),
  CONSTRAINT log_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.qualities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Star'::text,
  points integer NOT NULL DEFAULT 0,
  color text DEFAULT '#6366f1'::text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT qualities_pkey PRIMARY KEY (id),
  CONSTRAINT qualities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.note_qualities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL,
  quality_id uuid NOT NULL,
  user_id uuid NOT NULL,
  level integer NOT NULL CHECK (level = ANY (ARRAY[1, 3, 5])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT note_qualities_pkey PRIMARY KEY (id),
  CONSTRAINT note_qualities_note_fk FOREIGN KEY (note_id) REFERENCES public.notes(id),
  CONSTRAINT note_qualities_quality_fk FOREIGN KEY (quality_id) REFERENCES public.qualities(id),
  CONSTRAINT note_qualities_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.task_qualities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  quality_id uuid NOT NULL,
  user_id uuid NOT NULL,
  level integer NOT NULL CHECK (level = ANY (ARRAY[1, 3, 5])),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT task_qualities_pkey PRIMARY KEY (id),
  CONSTRAINT task_qualities_task_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT task_qualities_quality_fk FOREIGN KEY (quality_id) REFERENCES public.qualities(id) ON DELETE CASCADE,
  CONSTRAINT task_qualities_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT task_qualities_task_quality_unique UNIQUE (task_id, quality_id)
);
CREATE TABLE public.quality_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quality_id uuid NOT NULL,
  note_id uuid,
  task_id uuid,
  project_id uuid,
  note_title text,
  task_title text,
  project_name text,
  quality_name text,
  quality_icon text,
  points_delta integer NOT NULL,
  level_label text,
  source text NOT NULL DEFAULT 'note'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT quality_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT quality_transactions_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT quality_transactions_quality_fk FOREIGN KEY (quality_id) REFERENCES public.qualities(id),
  CONSTRAINT quality_transactions_note_fk FOREIGN KEY (note_id) REFERENCES public.notes(id),
  CONSTRAINT quality_transactions_task_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT quality_transactions_project_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
);
-- ═══════════════════════════════════════════════════════════════
-- Phase K · 내 메뉴 (자주 먹는 메뉴 저장 · 1탭 기록)
-- ═══════════════════════════════════════════════════════════════

create table if not exists my_menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  foods jsonb not null,     -- [{name, portion, kcal, protein_g, carbs_g, fat_g, sodium_mg, fiber_g}, ...]
  totals jsonb,              -- {kcal, protein_g, ...}
  tag text,                  -- 'breakfast' / 'lunch' / 'dinner' / 'snack' (선호 끼니)
  store_tag jsonb,           -- 매장 정보 (선택)
  use_count int default 0,   -- 몇 번 사용했는지
  last_used_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists my_menus_user_idx on my_menus(user_id, last_used_at desc nulls last);
create index if not exists my_menus_use_count_idx on my_menus(user_id, use_count desc);

alter table my_menus enable row level security;
drop policy if exists my_menus_deny on my_menus;
create policy my_menus_deny on my_menus for all using (false);

select 'my_menus schema ready' as status;

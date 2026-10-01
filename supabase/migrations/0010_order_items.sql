-- Combined-cart purchases: one order can buy several ticket types, each with its
-- own quantity. order.ticket_type_id stays for single-type orders; order_items is
-- the authoritative breakdown fulfillment iterates.
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id),
  quantity integer not null check (quantity >= 1),
  unit_price_centavos integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.order_items enable row level security;

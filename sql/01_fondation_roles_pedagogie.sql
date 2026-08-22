-- ============================================================
-- KEKELI v2 — Fondation : rôles/permissions + hiérarchie pédagogique
-- Repart de zéro (cf. cahier des charges).
-- Ordre d'exécution : ce fichier en premier, dans l'éditeur SQL Supabase.
-- ============================================================

-- ------------------------------------------------------------
-- 1. RÔLES & PROFILS
-- 5 rôles : super_admin, admin, enseignant, parent, eleve
-- ------------------------------------------------------------

create type role_utilisateur as enum ('super_admin', 'admin', 'enseignant', 'parent', 'eleve');

create table profils (
  id uuid primary key references auth.users(id) on delete cascade,
  role role_utilisateur not null,
  nom text not null,
  prenom text not null,
  identifiant text unique,  -- utilisé pour les comptes élèves (pas d'email requis)
  email text not null,
  actif boolean default true,
  cree_le timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. ADMINISTRATEURS & PERMISSIONS GRANULAIRES
-- Un super_admin a tous les droits. Un admin "secondaire" n'a
-- que les droits que le super_admin lui a explicitement accordés,
-- scopés par classe(s) et champ(s) de formation.
-- ------------------------------------------------------------

create table classes (
  id bigserial primary key,
  nom text not null,       -- CI, CP, CE1, CE2, CM1, CM2
  ordre int not null
);

create table champs_formation (
  id bigserial primary key,
  nom text not null,       -- Français, Mathématique, ES, EST, EA, EPS
  code text unique not null,
  actif boolean default true
);

-- un champ peut s'appliquer à plusieurs classes (config flexible, §4.2)
create table classes_champs_formation (
  classe_id bigint references classes(id) on delete cascade,
  champ_formation_id bigint references champs_formation(id) on delete cascade,
  primary key (classe_id, champ_formation_id)
);

create table administrateurs (
  id uuid primary key references profils(id) on delete cascade,
  est_super_admin boolean default false,
  peut_editer boolean default false,   -- droit d'éditer le contenu (dans son périmètre)
  peut_valider boolean default false,  -- droit de faire passer une séance en "publié"
  cree_par uuid references administrateurs(id), -- traçabilité : quel super_admin l'a créé
  cree_le timestamptz default now()
);

-- Périmètre d'un administrateur secondaire (ignoré si est_super_admin = true)
create table administrateur_classes (
  admin_id uuid references administrateurs(id) on delete cascade,
  classe_id bigint references classes(id) on delete cascade,
  primary key (admin_id, classe_id)
);

create table administrateur_champs (
  admin_id uuid references administrateurs(id) on delete cascade,
  champ_formation_id bigint references champs_formation(id) on delete cascade,
  primary key (admin_id, champ_formation_id)
);

-- Fonctions utilitaires de permission, utilisées par les policies RLS
-- et directement appelables depuis le frontend (RPC) pour piloter l'UI.

create or replace function est_super_admin(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select est_super_admin from administrateurs where id = p_id), false);
$$;

create or replace function peut_editer_perimetre(p_id uuid, p_classe_id bigint, p_champ_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when (select est_super_admin from administrateurs where id = p_id) then true
    when (select peut_editer from administrateurs where id = p_id) is not true then false
    else
      exists (select 1 from administrateur_classes where admin_id = p_id and classe_id = p_classe_id)
      and exists (select 1 from administrateur_champs where admin_id = p_id and champ_formation_id = p_champ_id)
  end;
$$;

create or replace function peut_valider_perimetre(p_id uuid, p_classe_id bigint, p_champ_id bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when (select est_super_admin from administrateurs where id = p_id) then true
    when (select peut_valider from administrateurs where id = p_id) is not true then false
    else
      exists (select 1 from administrateur_classes where admin_id = p_id and classe_id = p_classe_id)
      and exists (select 1 from administrateur_champs where admin_id = p_id and champ_formation_id = p_champ_id)
  end;
$$;

grant execute on function est_super_admin(uuid) to authenticated;
grant execute on function peut_editer_perimetre(uuid, bigint, bigint) to authenticated;
grant execute on function peut_valider_perimetre(uuid, bigint, bigint) to authenticated;

-- ------------------------------------------------------------
-- 3. HIÉRARCHIE PÉDAGOGIQUE (générique, valable pour tous les champs)
--
-- Français   : theme -> unite -> semaine -> discipline
-- Mathématique : dossier -> discipline
-- ES/EST/EA/EPS : discipline (seul niveau)
--
-- noeuds_parcours est auto-récursif : chaque champ empile le nombre
-- de niveaux dont il a besoin sans changer de table.
-- ------------------------------------------------------------

create type type_noeud as enum ('theme', 'unite', 'semaine', 'dossier', 'discipline');

create table noeuds_parcours (
  id bigserial primary key,
  classe_id bigint not null references classes(id),
  champ_formation_id bigint not null references champs_formation(id),
  parent_id bigint references noeuds_parcours(id) on delete cascade,
  type_noeud type_noeud not null,
  titre text not null,
  ordre int not null default 0,
  cree_le timestamptz default now()
);

create index idx_noeuds_parent on noeuds_parcours(parent_id);
create index idx_noeuds_classe_champ on noeuds_parcours(classe_id, champ_formation_id);

-- SA = Situation d'Apprentissage, rattachée au dernier noeud
-- (le noeud de type 'discipline', ou directement au champ si le champ
-- n'a aucun niveau intermédiaire).
create table sa (
  id bigserial primary key,
  noeud_id bigint not null references noeuds_parcours(id) on delete cascade,
  numero int,
  titre text not null,
  description text,
  ordre int not null default 0,
  cree_le timestamptz default now()
);

create type statut_seance as enum ('brouillon', 'publie', 'archive');

create table seances (
  id bigserial primary key,
  sa_id bigint not null references sa(id) on delete cascade,
  titre text not null,
  statut statut_seance not null default 'brouillon',
  ordre int not null default 0,
  cree_par uuid references profils(id),
  modifie_par uuid references profils(id),
  cree_le timestamptz default now(),
  modifie_le timestamptz default now()
);

-- Les 16 types de blocs du §6.1 du cahier des charges
create type type_bloc as enum (
  'texte', 'titre', 'a_retenir', 'definition', 'exemple', 'attention', 'astuce',
  'image', 'video', 'tableau', 'formule', 'activite', 'exercice', 'quiz',
  'evaluation', 'ressource'
);

create type palier_difficulte as enum ('azovi', 'devi', 'ogan', 'axosu');

create table blocs_seance (
  id bigserial primary key,
  seance_id bigint not null references seances(id) on delete cascade,
  type_bloc type_bloc not null,
  contenu jsonb not null default '{}',  -- structure libre selon type_bloc (cf. doc frontend)
  palier palier_difficulte,             -- pertinent surtout pour 'activite' et 'exercice'
  ordre int not null default 0,
  cree_le timestamptz default now()
);

create index idx_blocs_seance on blocs_seance(seance_id, ordre);

-- Bibliothèque réutilisable d'images/vidéos/PDF (§6)
create table bibliotheque_ressources (
  id bigserial primary key,
  type text not null check (type in ('image', 'video', 'pdf', 'autre')),
  nom text not null,
  url text not null,
  cree_par uuid references profils(id),
  cree_le timestamptz default now()
);

-- ------------------------------------------------------------
-- 4. RLS — lecture publique du contenu publié, édition réservée
--    aux administrateurs habilités sur leur périmètre.
-- ------------------------------------------------------------

alter table profils enable row level security;
alter table administrateurs enable row level security;
alter table noeuds_parcours enable row level security;
alter table sa enable row level security;
alter table seances enable row level security;
alter table blocs_seance enable row level security;
alter table bibliotheque_ressources enable row level security;

create policy "profil_lecture_soi" on profils for select using (id = auth.uid());

create policy "admin_lecture_soi" on administrateurs for select using (id = auth.uid());

-- Navigation : la structure (thèmes/unités/SA) est publique en lecture
create policy "noeuds_lecture_publique" on noeuds_parcours for select using (true);
create policy "sa_lecture_publique" on sa for select using (true);

-- Séances : publiques seulement si publiées ; visibles aux admins habilités sinon
create policy "seances_lecture_publiees" on seances for select using (
  statut = 'publie'
  or peut_editer_perimetre(auth.uid(), (select classe_id from noeuds_parcours n join sa on sa.noeud_id = n.id where sa.id = seances.sa_id), (select champ_formation_id from noeuds_parcours n join sa on sa.noeud_id = n.id where sa.id = seances.sa_id))
);

create policy "seances_edition_perimetre" on seances for insert with check (
  peut_editer_perimetre(auth.uid(), (select classe_id from noeuds_parcours n join sa on sa.noeud_id = n.id where sa.id = seances.sa_id), (select champ_formation_id from noeuds_parcours n join sa on sa.noeud_id = n.id where sa.id = seances.sa_id))
);
create policy "seances_maj_perimetre" on seances for update using (
  peut_editer_perimetre(auth.uid(), (select classe_id from noeuds_parcours n join sa on sa.noeud_id = n.id where sa.id = seances.sa_id), (select champ_formation_id from noeuds_parcours n join sa on sa.noeud_id = n.id where sa.id = seances.sa_id))
);

-- Blocs : héritent de la visibilité de leur séance
create policy "blocs_lecture" on blocs_seance for select using (
  exists (select 1 from seances where seances.id = blocs_seance.seance_id and seances.statut = 'publie')
  or exists (
    select 1 from seances s
    join sa on sa.id = s.sa_id
    join noeuds_parcours n on n.id = sa.noeud_id
    where s.id = blocs_seance.seance_id
    and peut_editer_perimetre(auth.uid(), n.classe_id, n.champ_formation_id)
  )
);
create policy "blocs_edition" on blocs_seance for all using (
  exists (
    select 1 from seances s
    join sa on sa.id = s.sa_id
    join noeuds_parcours n on n.id = sa.noeud_id
    where s.id = blocs_seance.seance_id
    and peut_editer_perimetre(auth.uid(), n.classe_id, n.champ_formation_id)
  )
);

create policy "ressources_lecture_publique" on bibliotheque_ressources for select using (true);
create policy "ressources_ajout_admins" on bibliotheque_ressources for insert with check (
  exists (select 1 from administrateurs where id = auth.uid())
);

-- ------------------------------------------------------------
-- 5. DONNÉES DE BASE (classes + champs) — à exécuter une fois
-- ------------------------------------------------------------

insert into classes (nom, ordre) values
  ('CI', 1), ('CP', 2), ('CE1', 3), ('CE2', 4), ('CM1', 5), ('CM2', 6);

insert into champs_formation (nom, code) values
  ('Français', 'francais'), ('Mathématique', 'mathematique'),
  ('ES', 'es'), ('EST', 'est'), ('EA', 'ea'), ('EPS', 'eps');

insert into classes_champs_formation (classe_id, champ_formation_id)
  select c.id, cf.id from classes c cross join champs_formation cf;

-- ------------------------------------------------------------
-- 6. BOOTSTRAP DU PREMIER SUPER ADMINISTRATEUR (à faire manuellement)
-- ------------------------------------------------------------
-- 1) Créez le compte dans Supabase Studio > Authentication > Add user
--    (avec un email + mot de passe).
-- 2) Copiez son UUID, puis exécutez :
--
-- insert into profils (id, role, nom, prenom, email) values
--   ('<uuid-copié>', 'super_admin', 'Votre nom', 'Votre prénom', 'vous@exemple.com');
-- insert into administrateurs (id, est_super_admin, peut_editer, peut_valider) values
--   ('<uuid-copié>', true, true, true);

/* DuoDisco sync (Supabase). Uses the same Supabase project as DuoVino, in its own duodisco_ table.
 * Leave url or key blank to keep everything on each device only.
 * url: the project URL. key: the project's publishable (anon) key. The key is meant to be public:
 *      the database only lets it call duodisco_load and duodisco_save (see supabase/duodisco.sql).
 */
window.DUODISCO_CLOUD = window.DUODISCO_CLOUD || {
  url: 'https://qjmefypqidheyuzkrlqu.supabase.co',
  key: 'sb_publishable__QoKgDZSuerubzX-TOEh2A_bBLSsmwc',
};

/* DuoDisco sync (Supabase). Uses the same Supabase project as Good Word Charlie, in its own duodisco_ table.
 * Leave url or key blank to keep everything on each device only.
 * url: the project URL. key: the project's publishable (anon) key. The key is meant to be public:
 *      the database only lets it call duodisco_load and duodisco_save (see supabase/duodisco.sql).
 */
window.DUODISCO_CLOUD = window.DUODISCO_CLOUD || {
  url: 'https://wyofeftnmuqlagiiwdib.supabase.co',
  key: 'sb_publishable_Ol-pAsFvGOHwu3JNBWt3Pw_UN9t90ho',
};

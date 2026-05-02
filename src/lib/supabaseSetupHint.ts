/** PostgREST error when tables from repo migrations were never applied to this Supabase project. */
export function isMissingDatabaseTablesError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes('schema cache') ||
    /could not find the table/i.test(message)
  );
}

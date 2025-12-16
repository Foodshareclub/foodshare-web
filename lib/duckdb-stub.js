/**
 * DuckDB stub for browser/Turbopack builds
 * DuckDB is a server-only native module that cannot be bundled
 * This stub prevents Turbopack from trying to parse the native module
 */
module.exports = {
  Database: function() {
    throw new Error('DuckDB is only available on the server');
  }
};

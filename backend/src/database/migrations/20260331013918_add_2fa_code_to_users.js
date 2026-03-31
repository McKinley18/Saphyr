/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.table('users', table => {
    table.string('two_factor_code').nullable();
    table.timestamp('two_factor_expires_at').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('two_factor_expires_at');
    table.dropColumn('two_factor_code');
  });
};

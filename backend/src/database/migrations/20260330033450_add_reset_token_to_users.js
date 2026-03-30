/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.table('users', table => {
    table.string('reset_token').nullable();
    table.timestamp('reset_token_expiry').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('reset_token_expiry');
    table.dropColumn('reset_token');
  });
};

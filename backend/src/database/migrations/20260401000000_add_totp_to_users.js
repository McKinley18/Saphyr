/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.table('users', table => {
    table.string('totp_secret').nullable();
    table.boolean('totp_enabled').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('totp_enabled');
    table.dropColumn('totp_secret');
  });
};

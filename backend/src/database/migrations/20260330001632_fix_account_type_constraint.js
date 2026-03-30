/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.raw('ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_type_check');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  // No need to bring back a restrictive constraint
  return Promise.resolve();
};

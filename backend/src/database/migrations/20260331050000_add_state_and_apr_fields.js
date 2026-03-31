/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema
    .table('salary_profiles', table => {
      // APR was already added in a previous migration, only adding State here
      table.string('state').defaultTo('WA'); 
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema
    .table('salary_profiles', table => {
      table.dropColumn('state');
    });
};

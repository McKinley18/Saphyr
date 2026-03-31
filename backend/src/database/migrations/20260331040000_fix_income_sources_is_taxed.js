/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.table('income_sources', table => {
    // Add the missing column that is causing the 500 error
    table.boolean('is_taxed').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.table('income_sources', table => {
    table.dropColumn('is_taxed');
  });
};

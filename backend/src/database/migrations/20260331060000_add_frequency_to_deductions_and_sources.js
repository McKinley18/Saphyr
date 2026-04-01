/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema
    .table('custom_deductions', table => {
      table.string('frequency').defaultTo('monthly'); // 'monthly', 'bi-weekly', 'weekly'
    })
    .table('income_sources', table => {
      table.string('frequency').defaultTo('monthly');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema
    .table('custom_deductions', table => {
      table.dropColumn('frequency');
    })
    .table('income_sources', table => {
      table.dropColumn('frequency');
    });
};

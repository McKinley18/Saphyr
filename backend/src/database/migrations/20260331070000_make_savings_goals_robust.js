/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.table('savings_goals', table => {
    table.decimal('monthly_contribution', 19, 4).defaultTo(0);
    table.uuid('account_id').references('id').inTable('accounts').onDelete('SET NULL').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.table('savings_goals', table => {
    table.dropColumn('monthly_contribution');
    table.dropColumn('account_id');
  });
};

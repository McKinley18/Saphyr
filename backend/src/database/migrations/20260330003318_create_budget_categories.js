/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema
    .createTable('budget_categories', table => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('name').notNullable();
      table.decimal('monthly_limit', 19, 4).notNullable();
      table.timestamps(true, true);
    })
    .table('transactions', table => {
      table.uuid('budget_category_id').references('id').inTable('budget_categories').onDelete('SET NULL');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema
    .table('transactions', table => {
      table.dropColumn('budget_category_id');
    })
    .dropTableIfExists('budget_categories');
};

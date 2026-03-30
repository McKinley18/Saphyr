/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema
    .createTable('salary_profiles', table => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.decimal('annual_salary', 19, 4).notNullable();
      table.decimal('401k_percent', 5, 4).defaultTo(0);
      table.string('pay_frequency').defaultTo('monthly');
      table.timestamps(true, true);
    })
    .table('accounts', table => {
      table.string('group_name').defaultTo('Uncategorized');
      table.decimal('apr', 5, 4).defaultTo(0);
      table.boolean('is_bill').defaultTo(false);
      table.boolean('is_taxable_source').defaultTo(false); // For extra cash sources
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema
    .table('accounts', table => {
      table.dropColumn('is_taxable_source');
      table.dropColumn('is_bill');
      table.dropColumn('apr');
      table.dropColumn('group_name');
    })
    .dropTableIfExists('salary_profiles');
};

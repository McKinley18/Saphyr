/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.createTable('income_sources', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.decimal('amount', 19, 4).notNullable();
    table.uuid('account_id').references('id').inTable('accounts').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.dropTableIfExists('income_sources');
};

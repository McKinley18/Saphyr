/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema
    .table('accounts', table => {
      table.integer('due_day').nullable(); // 1-31
    })
    .createTable('savings_goals', table => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('name').notNullable();
      table.decimal('target_amount', 19, 4).notNullable();
      table.decimal('current_amount', 19, 4).defaultTo(0);
      table.string('color').defaultTo('#2563eb');
      table.timestamps(true, true);
    })
    .createTable('daily_snapshots', table => {
      table.uuid('id').primary().defaultTo(knex.fn.uuid());
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.date('date').notNullable();
      table.decimal('net_worth', 19, 4).notNullable();
      table.decimal('total_cash', 19, 4).notNullable();
      table.decimal('total_debt', 19, 4).notNullable();
      table.unique(['user_id', 'date']);
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('daily_snapshots')
    .dropTableIfExists('savings_goals')
    .table('accounts', table => {
      table.dropColumn('due_day');
    });
};

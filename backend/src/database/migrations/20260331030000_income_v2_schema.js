/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.table('salary_profiles', table => {
    table.decimal('hourly_rate', 19, 4).nullable();
    table.integer('hours_per_week').nullable();
    table.boolean('is_hourly').defaultTo(false);
    table.decimal('manual_tax_amount', 19, 4).nullable();
    table.boolean('use_manual_tax').defaultTo(false);
  }).createTable('custom_deductions', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable(); // e.g. "Health Insurance"
    table.decimal('amount', 19, 4).notNullable();
    table.boolean('is_pre_tax').defaultTo(true);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema
    .dropTableIfExists('custom_deductions')
    .table('salary_profiles', table => {
      table.dropColumn('hourly_rate');
      table.dropColumn('hours_per_week');
      table.dropColumn('is_hourly');
      table.dropColumn('manual_tax_amount');
      table.dropColumn('use_manual_tax');
    });
};

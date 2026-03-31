/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.table('users', table => {
    table.timestamp('last_login_at').nullable();
    table.integer('auto_logout_minutes').defaultTo(30);
    table.string('two_factor_method').defaultTo('none'); // 'none', 'email', 'sms'
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('last_login_at');
    table.dropColumn('auto_logout_minutes');
    table.dropColumn('two_factor_method');
  });
};

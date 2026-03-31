/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function(knex) {
  return knex.schema.table('users', table => {
    table.string('accent_color').defaultTo('#3b82f6');
    table.string('currency_symbol').defaultTo('$');
    table.text('visible_tabs').nullable(); // JSON string of paths like '["/", "/income"]'
    table.boolean('stealth_mode').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function(knex) {
  return knex.schema.table('users', table => {
    table.dropColumn('stealth_mode');
    table.dropColumn('visible_tabs');
    table.dropColumn('currency_symbol');
    table.dropColumn('accent_color');
  });
};

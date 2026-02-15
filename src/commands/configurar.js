import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from 'discord.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENV_DESCRIPTIONS = {
  DISCORD_TOKEN: 'Token secreto del bot (Developer Portal). No se muestra ni configura aquí.',
  GUILD_ID: 'ID del servidor donde se publica el panel principal.',
  PANEL_CHANNEL_ID: 'ID del canal donde aparece el panel con botones.',
  EVENTS_CHANNEL_ID: 'Canal donde se publican los eventos nuevos (opcional).',
  EVENTS_CHANNEL_LOOT_ID: 'Canal donde se envía el resumen de reparto de loot (opcional).',
  EVENTS_ANNOUNCE_ROLE_ID: 'Rol mencionado al publicar un evento nuevo (opcional).',
  ADMIN_USER_IDS: 'IDs de usuarios admin separados por coma (acceso al panel).',
  LEADER_ROLE_IDS: 'IDs de roles de líder/oficial separados por coma.',
  FUND_PERCENTAGE_DEFAULT: 'Porcentaje por defecto al fondo del gremio. Ej: 0.1 = 10%, 0.15 = 15%'
};

const EDITABLE_VARS = [
  'GUILD_ID',
  'PANEL_CHANNEL_ID',
  'EVENTS_CHANNEL_ID',
  'EVENTS_CHANNEL_LOOT_ID',
  'EVENTS_ANNOUNCE_ROLE_ID',
  'ADMIN_USER_IDS',
  'LEADER_ROLE_IDS',
  'FUND_PERCENTAGE_DEFAULT'
];

function getEnvPath() {
  return join(__dirname, '../../.env');
}

function parseEnv(content) {
  const lines = content.split('\n');
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      result[key] = value;
    }
  }
  return result;
}

function serializeEnv(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
}

export const data = new SlashCommandBuilder()
  .setName('configurar')
  .setDescription('Configurar variables de entorno del bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sc =>
    sc.setName('variables').setDescription('Ver variables de entorno y sus descripciones')
  )
  .addSubcommand(sc =>
    sc.setName('establecer').setDescription('Establecer una variable (requiere reiniciar el bot)')
      .addStringOption(o => o
        .setName('variable')
        .setDescription('Variable a modificar')
        .setRequired(true)
        .addChoices(
          { name: 'GUILD_ID - ID del servidor', value: 'GUILD_ID' },
          { name: 'PANEL_CHANNEL_ID - Canal del panel', value: 'PANEL_CHANNEL_ID' },
          { name: 'EVENTS_CHANNEL_ID - Canal de eventos', value: 'EVENTS_CHANNEL_ID' },
          { name: 'EVENTS_CHANNEL_LOOT_ID - Canal de loot', value: 'EVENTS_CHANNEL_LOOT_ID' },
          { name: 'EVENTS_ANNOUNCE_ROLE_ID - Rol de anuncio', value: 'EVENTS_ANNOUNCE_ROLE_ID' },
          { name: 'ADMIN_USER_IDS - IDs admin', value: 'ADMIN_USER_IDS' },
          { name: 'LEADER_ROLE_IDS - IDs roles líder', value: 'LEADER_ROLE_IDS' },
          { name: 'FUND_PERCENTAGE_DEFAULT - % al fondo (ej: 0.1)', value: 'FUND_PERCENTAGE_DEFAULT' }
        ))
      .addStringOption(o => o.setName('valor').setDescription('Nuevo valor').setRequired(true))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'variables') {
    const allVars = { ...process.env };
    const envPath = getEnvPath();
    let envVars = {};
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf8');
        envVars = parseEnv(content);
      } catch (err) {
        console.error('Error leyendo .env:', err?.message);
      }
    }
    const vars = { ...envVars, ...allVars };

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('⚙️ Variables de entorno')
      .setDescription('Configuración actual. Usa `/configurar establecer` para modificar.')
      .setTimestamp();

    const varNames = [
      'GUILD_ID', 'PANEL_CHANNEL_ID', 'EVENTS_CHANNEL_ID', 'EVENTS_CHANNEL_LOOT_ID',
      'EVENTS_ANNOUNCE_ROLE_ID', 'ADMIN_USER_IDS', 'LEADER_ROLE_IDS', 'FUND_PERCENTAGE_DEFAULT', 'DISCORD_TOKEN'
    ];

    for (const key of varNames) {
      const desc = ENV_DESCRIPTIONS[key] || key;
      let val = vars[key] ?? '(no definida)';
      if (key === 'DISCORD_TOKEN' && val !== '(no definida)') {
        val = '***' + (val.length > 4 ? val.slice(-4) : '****') + ' (oculto)';
      }
      const display = val.length > 50 ? val.slice(0, 47) + '...' : val;
      embed.addFields({
        name: key,
        value: `_${desc}_\n**Valor:** \`${display}\``,
        inline: false
      });
    }

    embed.setFooter({ text: 'Reinicia el bot para aplicar cambios realizados con "establecer".' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'establecer') {
    const variable = interaction.options.getString('variable');
    const valor = interaction.options.getString('valor');

    if (!EDITABLE_VARS.includes(variable)) {
      return interaction.reply({
        content: `No se puede modificar \`${variable}\` desde aquí.`,
        ephemeral: true
      });
    }

    const envPath = getEnvPath();
    let envVars = {};
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf8');
        envVars = parseEnv(content);
      } catch (err) {
        return interaction.reply({
          content: 'Error leyendo el archivo .env',
          ephemeral: true
        });
      }
    }

    envVars[variable] = valor;

    try {
      writeFileSync(envPath, serializeEnv(envVars), 'utf8');
    } catch (err) {
      return interaction.reply({
        content: `Error guardando: ${err?.message}`,
        ephemeral: true
      });
    }

    process.env[variable] = valor;

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('Variable actualizada')
          .setDescription(`\`${variable}\` = \`${valor.length > 80 ? valor.slice(0, 77) + '...' : valor}\``)
          .setFooter({ text: 'Reinicia el bot para que el cambio afecte al panel y canales.' })
          .setTimestamp()
      ],
      ephemeral: true
    });
  }
}

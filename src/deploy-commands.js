import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

config();

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token || !guildId) {
  console.error('Configura DISCORD_TOKEN y GUILD_ID en .env');
  process.exit(1);
}

const rest = new REST().setToken(token);

(async () => {
  const adminCmd = (await import('./commands/admin.js')).data;
  const configurarCmd = (await import('./commands/configurar.js')).data;
  const commands = [adminCmd.toJSON(), configurarCmd.toJSON()];

  try {
    const appId = process.env.APPLICATION_ID || (await rest.get(Routes.oauth2CurrentApplication())).id;
    console.log(`Registrando ${commands.length} comandos slash...`);
    await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands });
    console.log('Listo. Comandos: /gremio, /configurar');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

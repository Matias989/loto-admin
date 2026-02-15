import { createServer } from 'http';
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { config } from 'dotenv';
import { handleInteraction } from './handlers/interactions.js';
import { setupPanel } from './handlers/panel.js';
config();

// Servidor HTTP mínimo para health checks. Solo si PORT está definido (producción)
const port = process.env.PORT;
if (port) {
  createServer((_, res) => {
    res.writeHead(200);
    res.end('ok');
  }).listen(port, () => console.log(`Health check en :${port}`));
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Bot iniciado como ${c.user.tag}`);
  await setupPanel(c);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const name = interaction.commandName;
    if (name === 'gremio') {
      const { execute } = await import('./commands/admin.js');
      await execute(interaction);
      return;
    }
    if (name === 'configurar') {
      const { execute } = await import('./commands/configurar.js');
      await execute(interaction);
      return;
    }
  }
  await handleInteraction(interaction);
});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('Error al iniciar:', err);
  process.exit(1);
});

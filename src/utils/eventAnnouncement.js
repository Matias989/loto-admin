import { EmbedBuilder } from 'discord.js';
import { getEventAnnouncement, getEvent, getEventParticipants } from '../database/services.js';
import { eventDetailEmbed } from './embeds.js';
import { eventAnnouncementRows } from './components.js';

export async function updateEventAnnouncementMessage(client, eventId) {
  const ann = getEventAnnouncement(eventId);
  if (!ann) return;
  const event = getEvent(eventId);
  if (!event) return;
  try {
    const channel = await client.channels.fetch(ann.channel_id).catch(() => null);
    if (!channel) return;
    const msg = await channel.messages.fetch(ann.message_id).catch(() => null);
    if (!msg) return;
    if (event.status === 'cancelled') {
      const cancelledEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle(`🚫 ${event.activity_type} - Cancelado`)
        .setDescription(`Este evento fue cancelado.`)
        .setFooter({ text: `Evento #${event.id}` })
        .setTimestamp();
      await msg.edit({ embeds: [cancelledEmbed], components: [] });
      return;
    }
    if (event.status !== 'active') return;
    const participants = getEventParticipants(eventId);
    await msg.edit({
      embeds: [eventDetailEmbed(event, participants, participants.length)],
      components: eventAnnouncementRows(eventId)
    });
  } catch (err) {
    console.error('Error actualizando anuncio de evento:', err?.message);
  }
}

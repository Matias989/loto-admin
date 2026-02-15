import {
  getOrCreateUser,
  registerUser,
  getActiveEvents,
  getClosableEvents,
  getEvent,
  joinEvent,
  leaveEvent,
  getEventParticipants,
  getEventAnnouncement,
  setEventAnnouncement,
  getUserBalance,
  getWeeklyRanking,
  getMonthlyRanking,
  getBenefits,
  redeemBenefit,
  getFundBalance,
  getFundHistory,
  getPointHistory,
  getGuildConfig,
  getStats,
  getDefaultActivityPoints,
  getDefaultFundPercentage,
  recalculateRanks,
  resetWeeklyPoints,
  createEvent,
  findDuplicateEvent,
  getRecentEventsForReplicate,
  replicateEvent,
  getAllUserBalances,
  getPendingRedemptions,
  getBalanceHistory,
  closeEvent,
  cancelEvent,
  confirmEventParticipants,
  deductFromBalance,
  adjustPointsManual,
  createBenefit,
  addFundTransaction,
  updateGuildConfig
} from '../database/services.js';
import {
  mainPanelEmbed,
  eventsListEmbed,
  eventDetailEmbed,
  rankingEmbed,
  benefitsEmbed,
  userStatsEmbed,
  fundEmbed,
  lootDistributionEmbed,
  rulesEmbed,
  leadershipPanelEmbed,
  statsEmbed,
  successEmbed,
  errorEmbed,
  closeEventSelectEmbed,
  closeEventAttendeesEmbed,
  replicateEventSelectEmbed,
  balancesEmbed,
  removeFromEventSelectEmbed,
  removeFromEventParticipantsEmbed,
  deductSelectEmbed,
  adjustPointsSelectEmbed,
  fundTypeEmbed
} from '../utils/embeds.js';
import {
  mainPanelRows,
  eventsListRows,
  eventDetailRows,
  eventAnnouncementRows,
  benefitsRows,
  backButtonRow,
  leadershipRows,
  createEventActivitySelect,
  closeEventSelectRows,
  closeEventAttendeesRows,
  replicateEventSelectRows,
  removeFromEventSelectRows,
  removeFromEventParticipantsRows,
  deductUserSelectRow,
  adjustPointsUserSelectRow,
  fundTypeRows,
  leaderBackButtonRow,
  PREFIX
} from '../utils/components.js';
import { setLeaderState, getLeaderState, clearLeaderState } from '../utils/leaderState.js';
import { updateEventAnnouncementMessage } from '../utils/eventAnnouncement.js';
import { EmbedBuilder } from 'discord.js';
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';

export async function handleInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isUserSelectMenu() && !interaction.isModalSubmit()) return;

  const customId = interaction.customId || '';
  if (!customId.startsWith(PREFIX)) return;

  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  if (!guildId) {
    await interaction.reply({ content: 'Este comando solo funciona en un servidor.', ephemeral: true });
    return;
  }

  // Auto-registro: crear/actualizar usuario en cualquier interacción
  registerUser(guildId, userId, interaction.user.tag || interaction.user.username);

  try {
    // Back button - return to main panel
    if (customId === `${PREFIX}back`) {
      await showMainPanel(interaction, guildId, userId);
      return;
    }

    // Leader back - return to leadership panel
    if (customId === `${PREFIX}leader_back` && isLeader(interaction, guildId)) {
      const payload = {
        embeds: [leadershipPanelEmbed(getGuildConfig(guildId))],
        components: leadershipRows(),
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    // Mi Panel - personalized dashboard
    if (customId === `${PREFIX}panel`) {
      await showMainPanel(interaction, guildId, userId);
      return;
    }

    // Main panel buttons
    if (customId === `${PREFIX}events`) {
      await showEventsList(interaction, guildId);
      return;
    }
    if (customId === `${PREFIX}ranking`) {
      await showRanking(interaction, guildId);
      return;
    }
    if (customId === `${PREFIX}benefits`) {
      await showBenefits(interaction, guildId, userId);
      return;
    }
    if (customId === `${PREFIX}mystats`) {
      await showMyStats(interaction, guildId, userId);
      return;
    }
    if (customId === `${PREFIX}fund`) {
      if (!isLeader(interaction, guildId)) {
        const payload = { embeds: [errorEmbed('Sin permiso', 'Solo líderes pueden ver el fondo del gremio.')], ephemeral: true };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
        return;
      }
      await showFund(interaction, guildId);
      return;
    }
    if (customId === `${PREFIX}rules`) {
      await interaction.reply({ embeds: [rulesEmbed()], components: backButtonRow(), ephemeral: true });
      return;
    }

    // Event select from dropdown
    if (customId === `${PREFIX}event_select`) {
      const eventId = parseInt(interaction.values[0], 10);
      await showEventDetail(interaction, guildId, userId, eventId);
      return;
    }

    // Join/Leave event
    if (customId.startsWith(`${PREFIX}join_event:`)) {
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const eventId = parseInt(customId.split(':')[1], 10);
      getOrCreateUser(guildId, userId);
      const result = joinEvent(eventId, userId, guildId);
      if (result.ok) {
        updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});
        if (useUpdate(interaction)) {
          const event = getEvent(eventId);
          const participants = getEventParticipants(eventId);
          await interaction.editReply({
            embeds: [eventDetailEmbed(event, participants, participants.length)],
            components: eventDetailRows(eventId, true, isLeader(interaction, guildId))
          });
        } else {
          await interaction.editReply({
            embeds: [successEmbed('✅ Te uniste', `Te has unido al evento #${eventId}.`)]
          });
        }
      } else {
        await interaction.editReply({
          embeds: [errorEmbed('No se pudo unir', result.reason || 'Cupos llenos o ya inscrito.')]
        });
      }
      return;
    }
    if (customId.startsWith(`${PREFIX}leave_event:`)) {
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const eventId = parseInt(customId.split(':')[1], 10);
      const left = leaveEvent(eventId, userId);
      if (left) {
        updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});
      }
      const event = getEvent(eventId);
      if (!event || event.status !== 'active') {
        await interaction.editReply({
          embeds: [errorEmbed('Error', 'Evento no encontrado o cerrado.')],
          components: backButtonRow()
        });
        return;
      }
      if (!left) {
        await interaction.editReply({
          embeds: [errorEmbed('No estabas inscrito', 'No figurabas en este evento.')]
        });
        return;
      }
      if (useUpdate(interaction)) {
        const participants = getEventParticipants(eventId);
        await interaction.editReply({
          embeds: [eventDetailEmbed(event, participants, participants.length)],
          components: eventDetailRows(eventId, false, isLeader(interaction, guildId))
        });
      } else {
        await interaction.editReply({
          embeds: [successEmbed('✅ Saliste del evento', `Te has dado de baja del evento #${eventId}.`)]
        });
      }
      return;
    }

    // Cancelar evento (solo líderes)
    if (customId.startsWith(`${PREFIX}cancel_event:`)) {
      if (!isLeader(interaction, guildId)) {
        await interaction.reply({
          embeds: [errorEmbed('Sin permisos', 'Solo líderes y oficiales pueden cancelar eventos.')],
          ephemeral: true
        });
        return;
      }
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const eventId = parseInt(customId.split(':')[1], 10);
      const cancelled = cancelEvent(eventId, guildId);
      if (cancelled) {
        updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});
        await interaction.editReply({
          embeds: [successEmbed('🚫 Evento cancelado', `El evento #${eventId} ha sido cancelado. Ya no aparece en la lista de eventos activos.`)]
        });
        return;
      }
      await interaction.editReply({
        embeds: [errorEmbed('Error', 'Evento no encontrado o ya cerrado.')]
      });
      return;
    }

    // Redeem benefit
    if (customId === `${PREFIX}redeem_benefit`) {
      const benefitId = parseInt(interaction.values[0], 10);
      const result = redeemBenefit(guildId, userId, benefitId);
      const benefits = getBenefits(guildId);
      const user = getOrCreateUser(guildId, userId);
      if (result.success) {
        const msg = result.requiresManual
          ? 'Tu solicitud ha sido registrada. Un oficial la procesará pronto.'
          : '¡Beneficio canjeado correctamente!';
        const embeds = [successEmbed('✅ Canje exitoso', msg), benefitsEmbed(benefits, user.total_points)];
        const payload = { embeds, components: benefitsRows(benefits, user.total_points), ephemeral: true };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
      } else {
        await interaction.reply({
          embeds: [errorEmbed('Error', result.error || 'No se pudo canjear.')],
          ephemeral: true
        });
      }
      return;
    }

    // Leadership panel (check role)
    if (customId === `${PREFIX}leader`) {
      if (!isLeader(interaction, guildId)) {
        await interaction.reply({
          embeds: [errorEmbed('Sin permisos', 'Solo líderes y oficiales pueden acceder.')],
          ephemeral: true
        });
        return;
      }
      await interaction.reply({
        embeds: [leadershipPanelEmbed(getGuildConfig(guildId))],
        components: leadershipRows(),
        ephemeral: true
      });
      return;
    }

    // Leadership actions
    if (customId === `${PREFIX}leader_stats` && isLeader(interaction, guildId)) {
      const stats = getStats(guildId);
      recalculateRanks(guildId);
      const payload = { embeds: [statsEmbed(stats)], components: backButtonRow(), ephemeral: true };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if (customId === `${PREFIX}leader_reset` && isLeader(interaction, guildId)) {
      resetWeeklyPoints(guildId);
      recalculateRanks(guildId);
      const payload = { embeds: [successEmbed('✅ Ciclo reiniciado', 'Se ha reiniciado el ranking semanal.')], ephemeral: true };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if (customId === `${PREFIX}leader_create_event` && isLeader(interaction, guildId)) {
      await showCreateEventTypeSelect(interaction, guildId, true);
      return;
    }

    // Crear evento - accesible para todos desde la lista de eventos
    if (customId === `${PREFIX}create_event`) {
      await showCreateEventTypeSelect(interaction, guildId, false);
      return;
    }

    // Cancelar creación de evento (volver a lista de eventos)
    if (customId === `${PREFIX}create_event_cancel`) {
      await showEventsList(interaction, guildId);
      return;
    }

    // Create event flow - when user selects activity type (todos pueden crear)
    if (customId === `${PREFIX}create_event_type`) {
      const activityType = interaction.values[0];
      await showCreateEventModal(interaction, guildId, activityType);
      return;
    }

    // Modal submit for create event
    if (customId === `${PREFIX}create_event_modal` && interaction.isModalSubmit()) {
      try {
        await interaction.deferReply({ ephemeral: true });
      } catch (e) {
        return;
      }
      const dateTimeStr = interaction.fields.getTextInputValue('event_datetime');
      const maxPart = parseInt(interaction.fields.getTextInputValue('event_max') || '8', 10);
      const basePts = parseInt(interaction.fields.getTextInputValue('event_points') || '5', 10);
      let extraStr = '';
      try {
        extraStr = interaction.fields.getTextInputValue('event_extra') || '';
      } catch {
        extraStr = '';
      }
      const activityType = interaction.fields.getTextInputValue('event_type') || 'Otro';

      const [dateStr, timeStr] = dateTimeStr.includes(' ') ? dateTimeStr.split(' ') : [dateTimeStr, '20:00'];
      const scheduledAt = parseDateTime(dateStr, timeStr);
      const leader = isLeader(interaction, guildId);
      const profitable = leader && /si|sí|yes/i.test(extraStr);
      const fundMatch = extraStr.match(/(\d+\.?\d*)\s*%/);
      const fundPct = fundMatch ? parseFloat(fundMatch[1]) / 100 : getDefaultFundPercentage();
      if (!scheduledAt) {
        await interaction.editReply({
          embeds: [errorEmbed('Error', 'Fecha/hora inválida. Usa formato DD/MM/AAAA y HH:MM')]
        });
        return;
      }

      const scheduledAtStr = scheduledAt.toISOString().slice(0, 19).replace('T', ' ');
      const duplicate = findDuplicateEvent(guildId, activityType, scheduledAtStr);
      if (duplicate) {
        await interaction.editReply({
          embeds: [errorEmbed('Evento duplicado', `Ya existe un evento **${activityType}** programado para esa fecha y hora. Revisa la lista de eventos activos.`)]
        });
        return;
      }

      const eventId = createEvent(guildId, userId, {
        activityType,
        scheduledAt: scheduledAt.toISOString(),
        maxParticipants: Math.min(20, Math.max(1, maxPart)),
        basePoints: Math.max(1, basePts),
        isProfitable: profitable,
        fundPercentage: Math.min(1, Math.max(0, fundPct)),
        affectsAccounting: leader
      });

      if (eventId) {
        const event = getEvent(eventId);
        const eventsChannelId = process.env.EVENTS_CHANNEL_ID;
        const announceRoleId = process.env.EVENTS_ANNOUNCE_ROLE_ID;
        if (event && eventsChannelId) {
          try {
            const channel = await interaction.client.channels.fetch(eventsChannelId).catch(() => null);
            if (channel) {
              const content = announceRoleId ? `<@&${announceRoleId}> ¡Nueva actividad programada!` : '¡Nueva actividad programada!';
              const participants = getEventParticipants(eventId);
              const msg = await channel.send({
                content,
                embeds: [eventDetailEmbed(event, participants, participants.length)],
                components: eventAnnouncementRows(eventId)
              });
              setEventAnnouncement(eventId, channel.id, msg.id);
            }
          } catch (err) {
            console.error('Error publicando evento en canal:', err?.message);
          }
        }
      }

      const createdMsg = process.env.EVENTS_CHANNEL_ID
        ? `Evento #${eventId} creado y publicado en el canal de eventos.`
        : `Evento #${eventId} creado correctamente.`;
      await interaction.editReply({
        embeds: [successEmbed('✅ Evento creado', createdMsg)]
      });
      return;
    }

    // Cerrar evento - paso 1: seleccionar evento
    if (customId === `${PREFIX}leader_close` && isLeader(interaction, guildId)) {
      const events = getClosableEvents(guildId);
      if (!events.length) {
        const payload = { embeds: [errorEmbed('Sin eventos', 'No hay eventos activos para cerrar.')], components: backButtonRow(), ephemeral: true };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
        return;
      }
      const payload = { embeds: [closeEventSelectEmbed(events)], components: closeEventSelectRows(events), ephemeral: true };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    // Replicar evento - paso 1: seleccionar evento
    if (customId === `${PREFIX}leader_replicate` && isLeader(interaction, guildId)) {
      const events = getRecentEventsForReplicate(guildId);
      const payload = { embeds: [replicateEventSelectEmbed(events)], components: replicateEventSelectRows(events), ephemeral: true };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    // Replicar evento - paso 2: modal con nueva fecha
    if (customId === `${PREFIX}replicate_event_select` && isLeader(interaction, guildId)) {
      const eventId = parseInt(interaction.values[0], 10);
      setLeaderState(userId, { flow: 'replicate', sourceEventId: eventId });
      await showReplicateEventModal(interaction, guildId, eventId);
      return;
    }

    // Quitar de evento - paso 1: seleccionar evento
    if (customId === `${PREFIX}leader_remove_from_event` && isLeader(interaction, guildId)) {
      const events = getClosableEvents(guildId);
      if (!events.length) {
        const payload = { embeds: [errorEmbed('Sin eventos', 'No hay eventos activos.')], components: backButtonRow(), ephemeral: true };
        if (useUpdate(interaction)) await interaction.update(payload);
        else await interaction.reply(payload);
        return;
      }
      const payload = { embeds: [removeFromEventSelectEmbed(events)], components: removeFromEventSelectRows(events), ephemeral: true };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    // Quitar de evento - paso 2: seleccionar participantes
    if (customId === `${PREFIX}remove_event_select` && isLeader(interaction, guildId)) {
      const eventId = parseInt(interaction.values[0], 10);
      const event = getEvent(eventId);
      const participants = getEventParticipants(eventId);
      const participantsWithNames = await enrichParticipantsWithNames(interaction.guild, participants);
      const payload = {
        embeds: [removeFromEventParticipantsEmbed(event, participants)],
        components: removeFromEventParticipantsRows(eventId, participantsWithNames),
        ephemeral: true
      };
      await interaction.update(payload);
      return;
    }

    // Quitar de evento - paso 3: confirmar y quitar
    if (customId.startsWith(`${PREFIX}remove_participant_select:`) && isLeader(interaction, guildId) && interaction.isStringSelectMenu()) {
      const eventId = parseInt(customId.split(':')[1], 10);
      const userIdsToRemove = interaction.values || [];
      const event = getEvent(eventId);
      if (!event || event.status !== 'active') {
        await interaction.update({ embeds: [errorEmbed('Error', 'Evento no encontrado o cerrado.')], components: backButtonRow(), ephemeral: true });
        return;
      }
      let removed = 0;
      for (const uid of userIdsToRemove) {
        if (leaveEvent(eventId, uid)) removed++;
      }
      if (removed > 0) {
        updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});
      }
      const participants = getEventParticipants(eventId);
      const participantsWithNames = await enrichParticipantsWithNames(interaction.guild, participants);
      const payload = {
        embeds: [
          successEmbed('✅ Participantes quitados', `Se quitó a ${removed} persona(s) del evento #${eventId}.`),
          removeFromEventParticipantsEmbed(event, participants)
        ],
        components: removeFromEventParticipantsRows(eventId, participantsWithNames),
        ephemeral: true
      };
      await interaction.update(payload);
      return;
    }

    // Cerrar evento - seleccionar evento del menú
    if (customId === `${PREFIX}close_event_select` && isLeader(interaction, guildId)) {
      const eventId = parseInt(interaction.values[0], 10);
      const event = getEvent(eventId);
      const participants = getEventParticipants(eventId);
      const participantsWithNames = await enrichParticipantsWithNames(interaction.guild, participants);
      const payload = {
        embeds: [closeEventAttendeesEmbed(event, participants)],
        components: closeEventAttendeesRows(eventId, participantsWithNames),
        ephemeral: true
      };
      await interaction.update(payload);
      return;
    }

    // Cerrar evento - todos asistieron
    if (customId.startsWith(`${PREFIX}close_skip_attendees:`) && isLeader(interaction, guildId)) {
      const eventId = parseInt(customId.split(':')[1], 10);
      const participants = getEventParticipants(eventId);
      const attendedIds = participants.map(p => p.user_id);
      setLeaderState(userId, { flow: 'close_event', eventId, attendedIds });
      await showLootModal(interaction, 'close_event');
      return;
    }

    // Cerrar evento - cancelar (no se completó, sin puntos ni loot)
    if (customId.startsWith(`${PREFIX}close_cancel_event:`) && isLeader(interaction, guildId)) {
      const eventId = parseInt(customId.split(':')[1], 10);
      const cancelled = cancelEvent(eventId, guildId);
      if (cancelled) {
        updateEventAnnouncementMessage(interaction.client, eventId).catch(() => {});
        await interaction.update({
          embeds: [
            successEmbed('🚫 Evento cancelado', `El evento #${eventId} fue cancelado (no se completó). No se asignaron puntos ni loot.`),
            leadershipPanelEmbed(getGuildConfig(guildId))
          ],
          components: leadershipRows(),
          ephemeral: true
        });
        return;
      }
      await interaction.update({
        embeds: [errorEmbed('Error', 'Evento no encontrado o ya cerrado.')],
        components: leaderBackButtonRow(),
        ephemeral: true
      });
      return;
    }

    // Cerrar evento - seleccionar asistentes (StringSelectMenu de participantes)
    if (customId.startsWith(`${PREFIX}close_attendees:`) && isLeader(interaction, guildId) && interaction.isStringSelectMenu()) {
      const eventId = parseInt(customId.split(':')[1], 10);
      const attendedIds = (interaction.values || []).filter(v => v !== '_none');
      setLeaderState(userId, { flow: 'close_event', eventId, attendedIds });
      await showLootModal(interaction, 'close_event');
      return;
    }

    // Descontar - mostrar selector de usuario
    if (customId === `${PREFIX}leader_deduct` && isLeader(interaction, guildId)) {
      const payload = { embeds: [deductSelectEmbed()], components: deductUserSelectRow(), ephemeral: true };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    // Descontar - usuario seleccionado
    if (customId === `${PREFIX}deduct_user_select` && isLeader(interaction, guildId)) {
      const targetUserId = interaction.values[0];
      setLeaderState(userId, { flow: 'deduct', targetUserId });
      await showDeductModal(interaction, guildId, targetUserId);
      return;
    }

    // Ajustar puntos - mostrar selector
    if (customId === `${PREFIX}leader_adjust` && isLeader(interaction, guildId)) {
      const payload = { embeds: [adjustPointsSelectEmbed()], components: adjustPointsUserSelectRow(), ephemeral: true };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    // Ajustar puntos - usuario seleccionado
    if (customId === `${PREFIX}adjust_user_select` && isLeader(interaction, guildId)) {
      const targetUserId = interaction.values[0];
      setLeaderState(userId, { flow: 'adjust_points', targetUserId });
      await showAdjustPointsModal(interaction);
      return;
    }

    // Ver cuentas corrientes (ordenadas mayor a menor)
    if (customId === `${PREFIX}leader_accounts` && isLeader(interaction, guildId)) {
      const accounts = getAllUserBalances(guildId);
      const payload = {
        embeds: [balancesEmbed(accounts)],
        components: leaderBackButtonRow(),
        ephemeral: true
      };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    // Fondos - tipo
    if (customId === `${PREFIX}leader_fund` && isLeader(interaction, guildId)) {
      const fundBalance = getFundBalance(guildId);
      const payload = { embeds: [fundTypeEmbed(fundBalance)], components: fundTypeRows(), ephemeral: true };
      if (useUpdate(interaction)) await interaction.update(payload);
      else await interaction.reply(payload);
      return;
    }

    if ((customId === `${PREFIX}fund_ingreso` || customId === `${PREFIX}fund_egreso`) && isLeader(interaction, guildId)) {
      const tipo = customId.includes('ingreso') ? 'ingreso' : 'egreso';
      setLeaderState(userId, { flow: 'fund', tipo });
      await showFundModal(interaction, tipo);
      return;
    }

    // Nuevo beneficio
    if (customId === `${PREFIX}leader_benefits` && isLeader(interaction, guildId)) {
      await showCreateBenefitModal(interaction);
      return;
    }

    // Config
    if (customId === `${PREFIX}leader_config` && isLeader(interaction, guildId)) {
      await showConfigModal(interaction);
      return;
    }

    // Modal submit - replicar evento
    if (customId === `${PREFIX}replicate_event_modal` && interaction.isModalSubmit() && isLeader(interaction, guildId)) {
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const state = getLeaderState(userId);
      if (!state || state.flow !== 'replicate' || !state.sourceEventId) {
        await interaction.editReply({ embeds: [errorEmbed('Expirado', 'La sesión expiró. Vuelve a intentar.')] });
        return;
      }
      const dateTimeStr = interaction.fields.getTextInputValue('event_datetime');
      const [dateStr, timeStr] = dateTimeStr.includes(' ') ? dateTimeStr.split(' ') : [dateTimeStr, '20:00'];
      const scheduledAt = parseDateTime(dateStr, timeStr);
      if (!scheduledAt) {
        await interaction.editReply({ embeds: [errorEmbed('Error', 'Fecha/hora inválida. Usa formato DD/MM/AAAA HH:MM (UTC)')] });
        return;
      }
      const eventId = replicateEvent(guildId, userId, state.sourceEventId, scheduledAt.toISOString());
      clearLeaderState(userId);
      if (eventId) {
        const event = getEvent(eventId);
        const eventsChannelId = process.env.EVENTS_CHANNEL_ID;
        const announceRoleId = process.env.EVENTS_ANNOUNCE_ROLE_ID;
        if (event && eventsChannelId) {
          try {
            const channel = await interaction.client.channels.fetch(eventsChannelId).catch(() => null);
            if (channel) {
              const content = announceRoleId ? `<@&${announceRoleId}> ¡Evento replicado!` : '¡Evento replicado!';
              const participants = getEventParticipants(eventId);
              const msg = await channel.send({
                content,
                embeds: [eventDetailEmbed(event, participants, participants.length)],
                components: eventAnnouncementRows(eventId)
              });
              setEventAnnouncement(eventId, channel.id, msg.id);
            }
          } catch (err) {
            console.error('Error publicando evento replicado:', err?.message);
          }
        }
        await interaction.editReply({
          embeds: [successEmbed('✅ Evento replicado', `Evento #${eventId} creado con los mismos participantes. Fecha: ${scheduledAt.toLocaleString('es-ES')}`)]
        });
      } else {
        await interaction.editReply({ embeds: [errorEmbed('Error', 'No se pudo replicar. ¿Ya existe un evento similar en esa fecha?')] });
      }
      return;
    }

    // Modal submits
    if (customId === `${PREFIX}close_event_loot` && interaction.isModalSubmit() && isLeader(interaction, guildId)) {
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const state = getLeaderState(userId);
      if (!state || state.flow !== 'close_event') {
        await interaction.editReply({ embeds: [errorEmbed('Expirado', 'La sesión expiró. Vuelve a intentar.')] });
        return;
      }
      const lootStr = interaction.fields.getTextInputValue('loot_total') || '0';
      const lootTotal = parseFloat(lootStr.replace(/,/g, '.')) || 0;
      const event = getEvent(state.eventId);
      const affectsAccounting = event?.affects_accounting !== 0;
      const fundPct = event?.fund_percentage ?? getDefaultFundPercentage();
      closeEvent(state.eventId, getGuildConfig(guildId));
      confirmEventParticipants(state.eventId, state.attendedIds, lootTotal);
      if (affectsAccounting) recalculateRanks(guildId);
      clearLeaderState(userId);

      const share = state.attendedIds.length > 0 && lootTotal > 0
        ? ((lootTotal * (1 - fundPct)) / state.attendedIds.length).toFixed(0)
        : 0;
      const fundCut = lootTotal * fundPct;
      const shareNum = state.attendedIds.length > 0 && lootTotal > 0 ? (lootTotal * (1 - fundPct)) / state.attendedIds.length : 0;

      const lootChannelId = process.env.EVENTS_CHANNEL_LOOT_ID;
      if (affectsAccounting && lootChannelId && lootTotal > 0 && state.attendedIds.length > 0) {
        try {
          const channel = await interaction.client.channels.fetch(lootChannelId).catch(() => null);
          if (channel) {
            const content = state.attendedIds.map(id => `<@${id}>`).join(' ');
            await channel.send({
              content,
              embeds: [lootDistributionEmbed(event, lootTotal, shareNum, fundCut, state.attendedIds)]
            });
          }
        } catch (err) {
          console.error('Error enviando repartición de loot al canal:', err?.message);
        }
      }

      const closedMsg = affectsAccounting
        ? `Puntos asignados. Loot repartido: ${share} silver por persona.`
        : 'Evento cerrado (sin afectar cuentas ni puntos).';
      await interaction.editReply({
        embeds: [successEmbed('✅ Evento cerrado', closedMsg)]
      });
      return;
    }

    if (customId === `${PREFIX}deduct_modal` && interaction.isModalSubmit() && isLeader(interaction, guildId)) {
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const state = getLeaderState(userId);
      if (!state || state.flow !== 'deduct') {
        await interaction.editReply({ embeds: [errorEmbed('Expirado', 'Sesión expirada.')] });
        return;
      }
      const monto = parseFloat((interaction.fields.getTextInputValue('monto') || '0').replace(/,/g, '.')) || 0;
      const razon = interaction.fields.getTextInputValue('razon') || 'Entrega';
      const result = deductFromBalance(guildId, state.targetUserId, monto, razon, userId);
      clearLeaderState(userId);
      await interaction.editReply({
        embeds: [successEmbed('✅ Descontado', `Se descontaron **${result.deducted.toLocaleString()}** silver de <@${state.targetUserId}>. Balance: **${result.newBalance.toLocaleString()}**`)]
      });
      return;
    }

    if (customId === `${PREFIX}adjust_modal` && interaction.isModalSubmit() && isLeader(interaction, guildId)) {
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const state = getLeaderState(userId);
      if (!state || state.flow !== 'adjust_points') {
        await interaction.editReply({ embeds: [errorEmbed('Expirado', 'Sesión expirada.')] });
        return;
      }
      const pts = parseInt(interaction.fields.getTextInputValue('puntos') || '0', 10);
      const razon = interaction.fields.getTextInputValue('razon') || 'Ajuste';
      adjustPointsManual(guildId, state.targetUserId, pts, razon);
      const user = getOrCreateUser(guildId, state.targetUserId);
      clearLeaderState(userId);
      await interaction.editReply({
        embeds: [successEmbed('✅ Puntos ajustados', `<@${state.targetUserId}> ahora tiene **${user.total_points}** puntos.`)]
      });
      return;
    }

    if (customId === `${PREFIX}fund_modal` && interaction.isModalSubmit() && isLeader(interaction, guildId)) {
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const state = getLeaderState(userId);
      if (!state || state.flow !== 'fund') {
        await interaction.editReply({ embeds: [errorEmbed('Expirado', 'Sesión expirada.')] });
        return;
      }
      const monto = parseInt((interaction.fields.getTextInputValue('monto') || '0').replace(/\D/g, ''), 10) || 0;
      const desc = interaction.fields.getTextInputValue('desc') || `${state.tipo} manual`;
      addFundTransaction(guildId, monto, state.tipo, desc, null, userId);
      clearLeaderState(userId);
      await interaction.editReply({
        embeds: [successEmbed('✅ Fondos actualizados', `${state.tipo}: ${monto.toLocaleString()} silver`)]
      });
      return;
    }

    if (customId === `${PREFIX}benefit_modal` && interaction.isModalSubmit() && isLeader(interaction, guildId)) {
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const nombre = interaction.fields.getTextInputValue('nombre') || 'Beneficio';
      const desc = interaction.fields.getTextInputValue('desc') || '';
      const costo = parseInt(interaction.fields.getTextInputValue('costo') || '0', 10) || 0;
      const manualStr = (interaction.fields.getTextInputValue('manual') || 'no').toLowerCase();
      const manual = /si|sí|yes|1|true/i.test(manualStr);
      const id = createBenefit(guildId, { name: nombre, description: desc, cost: costo, requiresManual: manual });
      await interaction.editReply({
        embeds: [successEmbed('✅ Beneficio creado', `${nombre} - ${costo} pts`)]
      });
      return;
    }

    if (customId === `${PREFIX}config_modal` && interaction.isModalSubmit() && isLeader(interaction, guildId)) {
      try { await interaction.deferReply({ ephemeral: true }); } catch { return; }
      const adminUsers = interaction.fields.getTextInputValue('admin_users') || '';
      const leaderRoles = interaction.fields.getTextInputValue('leader_roles') || '';
      const fundPct = interaction.fields.getTextInputValue('fund_pct');
      const noShow = interaction.fields.getTextInputValue('no_show');
      const updates = { admin_user_ids: adminUsers, leader_role_ids: leaderRoles };
      if (fundPct && !isNaN(parseFloat(fundPct))) updates.fund_percentage = parseFloat(fundPct) / 100;
      if (noShow && !isNaN(parseInt(noShow, 10))) updates.no_show_penalty = parseInt(noShow, 10);
      if (Object.keys(updates).length) updateGuildConfig(guildId, updates);
      await interaction.editReply({
        embeds: [successEmbed('✅ Configuración actualizada', 'Los cambios se han guardado.')]
      });
      return;
    }

    if (customId === `${PREFIX}leader_events` && isLeader(interaction, guildId)) {
      await showCreateEventTypeSelect(interaction, guildId, true);
      return;
    }
  } catch (err) {
    console.error('Interaction error:', err);
    await interaction.reply({
      embeds: [errorEmbed('Error', 'Ocurrió un error. Intenta de nuevo.')],
      ephemeral: true
    }).catch(() => {});
  }
}

function isLeader(interaction, guildId) {
  const userId = interaction.user?.id;

  // 0. El dueño del servidor siempre tiene acceso (para configurar inicialmente)
  if (interaction.guild?.ownerId === userId) return true;

  const config = getGuildConfig(guildId);

  // 1. Admins por ID de usuario
  const adminIdsStr = config.admin_user_ids || process.env.ADMIN_USER_IDS || '';
  const adminIds = adminIdsStr.split(',').map(s => s.trim()).filter(Boolean);
  if (adminIds.includes(userId)) return true;

  // 2. Roles de líder/oficial en Discord
  const roleIdsStr = config.leader_role_ids || process.env.LEADER_ROLE_IDS || '';
  const roleIds = roleIdsStr.split(',').map(s => s.trim()).filter(Boolean);
  return roleIds.length > 0 && interaction.member?.roles?.cache?.some(r => roleIds.includes(r.id));
}

function useUpdate(interaction) {
  return (interaction.message?.flags?.bitfield & 64) === 64;
}

async function showMainPanel(interaction, guildId, userId) {
  const user = getOrCreateUser(guildId, userId);
  const fund = getFundBalance(guildId);
  const events = getActiveEvents(guildId);
  const topWeekly = getWeeklyRanking(guildId, 5);
  const guildName = interaction.guild?.name || 'Gremio';

  const payload = {
    embeds: [mainPanelEmbed(user, fund, events, topWeekly, guildName, isLeader(interaction, guildId))],
    components: mainPanelRows(),
    ephemeral: true
  };
  if (useUpdate(interaction)) {
    await interaction.update(payload);
  } else {
    await interaction.reply(payload);
  }
}

async function showEventsList(interaction, guildId) {
  const events = getActiveEvents(guildId);
  const payload = {
    embeds: [eventsListEmbed(events)],
    components: eventsListRows(events),
    ephemeral: true
  };
  if (useUpdate(interaction)) {
    await interaction.update(payload);
  } else {
    await interaction.reply(payload);
  }
}

async function enrichParticipantsWithNames(guild, participants) {
  if (!guild || !participants?.length) return participants.map(p => ({ ...p, displayName: null }));
  return Promise.all(participants.map(async (p) => {
    try {
      const member = await guild.members.fetch(p.user_id).catch(() => null);
      const displayName = member?.displayName || member?.user?.username || null;
      return { ...p, displayName };
    } catch {
      return { ...p, displayName: null };
    }
  }));
}

async function showEventDetail(interaction, guildId, userId, eventId) {
  const event = getEvent(eventId);
  if (!event || event.status !== 'active') {
    const payload = {
      embeds: [errorEmbed('Error', 'Evento no encontrado o cerrado.')],
      components: backButtonRow(),
      ephemeral: true
    };
    if (useUpdate(interaction)) await interaction.update(payload);
    else await interaction.reply(payload);
    return;
  }
  const participants = getEventParticipants(eventId);
  const isParticipant = participants.some(p => p.user_id === userId);
  const payload = {
    embeds: [eventDetailEmbed(event, participants, participants.length)],
    components: eventDetailRows(eventId, isParticipant, isLeader(interaction, guildId)),
    ephemeral: true
  };
  if (useUpdate(interaction)) await interaction.update(payload);
  else await interaction.reply(payload);
}

async function showRanking(interaction, guildId) {
  const weekly = getWeeklyRanking(guildId, 10);
  const monthly = getMonthlyRanking(guildId, 10);
  const payload = {
    embeds: [rankingEmbed(weekly, 'semanal'), rankingEmbed(monthly, 'mensual')],
    components: backButtonRow(),
    ephemeral: true
  };
  if (useUpdate(interaction)) await interaction.update(payload);
  else await interaction.reply(payload);
}

async function showBenefits(interaction, guildId, userId) {
  const benefits = getBenefits(guildId);
  const user = getOrCreateUser(guildId, userId);
  const payload = {
    embeds: [benefitsEmbed(benefits, user.total_points)],
    components: benefitsRows(benefits, user.total_points),
    ephemeral: true
  };
  if (useUpdate(interaction)) await interaction.update(payload);
  else await interaction.reply(payload);
}

async function showMyStats(interaction, guildId, userId) {
  const user = getOrCreateUser(guildId, userId);
  const history = getPointHistory(guildId, userId, 10);
  const balanceHistory = getBalanceHistory(guildId, userId, 8);
  const payload = {
    embeds: [userStatsEmbed(user, history, balanceHistory)],
    components: backButtonRow(),
    ephemeral: true
  };
  if (useUpdate(interaction)) await interaction.update(payload);
  else await interaction.reply(payload);
}

async function showFund(interaction, guildId) {
  const balance = getFundBalance(guildId);
  const history = getFundHistory(guildId, 10);
  const payload = {
    embeds: [fundEmbed(balance, history)],
    components: backButtonRow(),
    ephemeral: true
  };
  if (useUpdate(interaction)) await interaction.update(payload);
  else await interaction.reply(payload);
}

async function showCreateEventTypeSelect(interaction, guildId, fromLeadership = true) {
  const { ButtonBuilder, ButtonStyle } = await import('discord.js');
  const select = createEventActivitySelect();
  const cancelId = fromLeadership ? `${PREFIX}leader_back` : `${PREFIX}create_event_cancel`;
  await (interaction.replied || interaction.deferred ? interaction.editReply : interaction.reply).call(interaction, {
    content: 'Selecciona el tipo de actividad para el evento:',
    components: [
      new ActionRowBuilder().addComponents(select),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(cancelId).setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
      )
    ],
    ephemeral: true
  });
}

async function showCreateEventModal(interaction, guildId, activityType) {
  const leader = isLeader(interaction, guildId);
  const modal = new ModalBuilder()
    .setCustomId(`${PREFIX}create_event_modal`)
    .setTitle('Crear Evento');

  const components = [
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_type')
        .setLabel('Tipo (no modificar)')
        .setStyle(TextInputStyle.Short)
        .setValue(activityType)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_datetime')
        .setLabel('Fecha y hora UTC (DD/MM/AAAA HH:MM)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ej: 15/02/2025 20:00')
        .setValue(formatDateTimeUTC())
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_max')
        .setLabel('Cupo máximo')
        .setStyle(TextInputStyle.Short)
        .setValue('8')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_points')
        .setLabel('Puntos base')
        .setStyle(TextInputStyle.Short)
        .setValue('5')
        .setRequired(true)
    )
  ];
  if (leader) {
    components.push(new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_extra')
        .setLabel('Rentable (si/no) y % fondo')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ej: si, 10%')
        .setValue('no')
        .setRequired(false)
    ));
  }
  modal.addComponents(...components);

  await interaction.showModal(modal);
}

async function showReplicateEventModal(interaction, guildId, sourceEventId) {
  const modal = new ModalBuilder()
    .setCustomId(`${PREFIX}replicate_event_modal`)
    .setTitle('Replicar Evento - Nueva fecha');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('event_datetime')
        .setLabel('Nueva fecha y hora UTC (DD/MM/AAAA HH:MM)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ej: 15/02/2025 20:00')
        .setValue(formatDateTimeUTC())
        .setRequired(true)
    )
  );

  await interaction.showModal(modal);
}

/** Retorna fecha/hora actual en UTC formato DD/MM/AAAA HH:MM */
function formatDateTimeUTC() {
  const now = new Date();
  const d = now.getUTCDate().toString().padStart(2, '0');
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  const y = now.getUTCFullYear();
  const h = now.getUTCHours().toString().padStart(2, '0');
  const min = now.getUTCMinutes().toString().padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}`;
}

/** Parsea DD/MM/AAAA y HH:MM interpretando como UTC */
function parseDateTime(dateStr, timeStr) {
  try {
    const [d, m, y] = dateStr.split('/').map(Number);
    const [h, min] = (timeStr || '20:00').split(':').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, h || 20, min || 0, 0));
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

async function showLootModal(interaction, flow) {
  const modal = new ModalBuilder()
    .setCustomId(`${PREFIX}close_event_loot`)
    .setTitle('Loot del evento');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('loot_total')
        .setLabel('Loot total (silver, 0 si no hay)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ej: 15000 o 12500.5')
        .setValue('0')
        .setRequired(false)
    )
  );
  await interaction.showModal(modal);
}

async function showDeductModal(interaction, guildId, targetUserId) {
  const balance = getUserBalance(guildId, targetUserId);
  const balanceStr = Number(balance || 0).toLocaleString('es');
  const title = `Descontar · ${balanceStr} silver`.slice(0, 45);
  const modal = new ModalBuilder()
    .setCustomId(`${PREFIX}deduct_modal`)
    .setTitle(title);
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('monto')
        .setLabel('Monto a descontar (silver)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ej: 2500')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('razon')
        .setLabel('Razón (ej: Evento #5)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Entrega de parte')
        .setRequired(false)
    )
  );
  await interaction.showModal(modal);
}

async function showAdjustPointsModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`${PREFIX}adjust_modal`)
    .setTitle('Ajustar puntos');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('puntos')
        .setLabel('Puntos (+ o -, ej: 10 o -5)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('10')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('razon')
        .setLabel('Razón')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    )
  );
  await interaction.showModal(modal);
}

async function showFundModal(interaction, tipo) {
  const modal = new ModalBuilder()
    .setCustomId(`${PREFIX}fund_modal`)
    .setTitle(`${tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} de fondos`);
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('monto')
        .setLabel('Monto (silver)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('10000')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('desc')
        .setLabel('Descripción')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Donación / Reposición')
        .setRequired(false)
    )
  );
  await interaction.showModal(modal);
}

async function showCreateBenefitModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`${PREFIX}benefit_modal`)
    .setTitle('Nuevo beneficio');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('nombre')
        .setLabel('Nombre')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Reposición parcial')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('desc')
        .setLabel('Descripción')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('costo')
        .setLabel('Costo (puntos)')
        .setStyle(TextInputStyle.Short)
        .setValue('25')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('manual')
        .setLabel('Requiere aprobación (si/no)')
        .setStyle(TextInputStyle.Short)
        .setValue('no')
        .setRequired(false)
    )
  );
  await interaction.showModal(modal);
}

async function showConfigModal(interaction) {
  const config = getGuildConfig(interaction.guildId);
  const modal = new ModalBuilder()
    .setCustomId(`${PREFIX}config_modal`)
    .setTitle('Configuración');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('admin_users')
        .setLabel('IDs usuarios admin (separados por coma)')
        .setStyle(TextInputStyle.Short)
        .setValue(config.admin_user_ids || '')
        .setPlaceholder('Ej: 123456789012345678')
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('leader_roles')
        .setLabel('IDs roles líder/oficial (separados por coma)')
        .setStyle(TextInputStyle.Short)
        .setValue(config.leader_role_ids || '')
        .setPlaceholder('Ej: 987654321098765432')
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('fund_pct')
        .setLabel('% al fondo (0-100)')
        .setStyle(TextInputStyle.Short)
        .setValue(String((config.fund_percentage ?? getDefaultFundPercentage()) * 100))
        .setRequired(false)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('no_show')
        .setLabel('Penalización no asistir')
        .setStyle(TextInputStyle.Short)
        .setValue(String(config.no_show_penalty || 0))
        .setRequired(false)
    )
  );
  await interaction.showModal(modal);
}

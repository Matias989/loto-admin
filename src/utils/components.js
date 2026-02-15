import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder } from 'discord.js';

const PREFIX = 'guild_';

export function mainPanelRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}panel`).setLabel('Mi Panel').setStyle(ButtonStyle.Primary).setEmoji('🏠'),
      new ButtonBuilder().setCustomId(`${PREFIX}events`).setLabel('Eventos').setStyle(ButtonStyle.Primary).setEmoji('📅'),
      new ButtonBuilder().setCustomId(`${PREFIX}ranking`).setLabel('Ranking').setStyle(ButtonStyle.Primary).setEmoji('🏆'),
      new ButtonBuilder().setCustomId(`${PREFIX}benefits`).setLabel('Beneficios').setStyle(ButtonStyle.Success).setEmoji('🎁')
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}mystats`).setLabel('Mis stats').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
      new ButtonBuilder().setCustomId(`${PREFIX}rules`).setLabel('Reglas').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader`).setLabel('Panel Liderazgo').setStyle(ButtonStyle.Secondary).setEmoji('⚙️')
    )
  ];
}

export function eventsListRows(events) {
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${PREFIX}create_event`).setLabel('Crear evento').setStyle(ButtonStyle.Success).setEmoji('📅'),
    new ButtonBuilder().setCustomId(`${PREFIX}back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
  );
  if (!events || events.length === 0) {
    return [backRow];
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}event_select`)
    .setPlaceholder('Selecciona un evento para unirte...')
    .addOptions(events.slice(0, 25).map(e => ({
      label: `${e.activity_type} - ${new Date(e.scheduled_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`,
      value: String(e.id),
      description: `${e.max_participants} cupos`
    })));
  return [
    new ActionRowBuilder().addComponents(select),
    backRow
  ];
}

export function eventDetailRows(eventId, isParticipant, isLeader = false) {
  const buttons = [
    isParticipant
      ? new ButtonBuilder().setCustomId(`${PREFIX}leave_event:${eventId}`).setLabel('Salir del evento').setStyle(ButtonStyle.Danger)
      : new ButtonBuilder().setCustomId(`${PREFIX}join_event:${eventId}`).setLabel('Unirse al evento').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${PREFIX}back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
  ];
  if (isLeader) {
    buttons.unshift(new ButtonBuilder().setCustomId(`${PREFIX}cancel_event:${eventId}`).setLabel('Cancelar evento').setStyle(ButtonStyle.Danger).setEmoji('🚫'));
  }
  return [new ActionRowBuilder().addComponents(...buttons)];
}

export function eventAnnouncementRows(eventId, showCancel = true) {
  const buttons = [
    new ButtonBuilder().setCustomId(`${PREFIX}join_event:${eventId}`).setLabel('Unirse al evento').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`${PREFIX}leave_event:${eventId}`).setLabel('Salir del evento').setStyle(ButtonStyle.Secondary)
  ];
  if (showCancel) {
    buttons.push(new ButtonBuilder().setCustomId(`${PREFIX}cancel_event:${eventId}`).setLabel('Cancelar evento').setStyle(ButtonStyle.Danger).setEmoji('🚫'));
  }
  return [new ActionRowBuilder().addComponents(...buttons)];
}

export function benefitsRows(benefits, userPoints) {
  const rows = [];
  if (benefits.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(`${PREFIX}redeem_benefit`)
      .setPlaceholder('Canjear beneficio...')
      .addOptions(benefits.slice(0, 25).map(b => ({
        label: `${b.name} (${b.cost} pts)`,
        value: String(b.id),
        description: userPoints >= b.cost ? 'Disponible' : `Necesitas ${b.cost - userPoints} pts más`
      })));
    rows.push(new ActionRowBuilder().addComponents(select));
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${PREFIX}back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
  ));
  return rows;
}

export function backButtonRow() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${PREFIX}back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
  )];
}

export function leaderBackButtonRow() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
  )];
}

export function leadershipRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_events`).setLabel('Crear evento').setStyle(ButtonStyle.Success).setEmoji('📅'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_close`).setLabel('Cerrar evento').setStyle(ButtonStyle.Primary).setEmoji('✅'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_remove_from_event`).setLabel('Quitar de evento').setStyle(ButtonStyle.Primary).setEmoji('➖'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_adjust`).setLabel('Ajustar puntos').setStyle(ButtonStyle.Primary).setEmoji('📊'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_deduct`).setLabel('Descontar').setStyle(ButtonStyle.Primary).setEmoji('💸')
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_replicate`).setLabel('Replicar evento').setStyle(ButtonStyle.Success).setEmoji('📋'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_accounts`).setLabel('Cuentas').setStyle(ButtonStyle.Secondary).setEmoji('💳'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_benefits`).setLabel('Nuevo beneficio').setStyle(ButtonStyle.Secondary).setEmoji('🎁'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_fund`).setLabel('Fondos').setStyle(ButtonStyle.Secondary).setEmoji('💰'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_config`).setLabel('Config').setStyle(ButtonStyle.Secondary).setEmoji('⚙️')
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_stats`).setLabel('Estadísticas').setStyle(ButtonStyle.Secondary).setEmoji('📈'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_reset`).setLabel('Reiniciar ciclo').setStyle(ButtonStyle.Secondary).setEmoji('🔄'),
      new ButtonBuilder().setCustomId(`${PREFIX}back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function closeEventSelectRows(events) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}close_event_select`)
    .setPlaceholder('Selecciona el evento a cerrar...')
    .addOptions(events.slice(0, 25).map(e => ({
      label: `#${e.id} ${e.activity_type}`,
      value: String(e.id),
      description: new Date(e.scheduled_at).toLocaleString('es-ES')
    })));
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function removeFromEventSelectRows(events) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}remove_event_select`)
    .setPlaceholder('Selecciona el evento...')
    .addOptions(events.slice(0, 25).map(e => ({
      label: `#${e.id} ${e.activity_type}`,
      value: String(e.id),
      description: new Date(e.scheduled_at).toLocaleString('es-ES')
    })));
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function replicateEventSelectRows(events) {
  if (!events?.length) {
    return [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )];
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}replicate_event_select`)
    .setPlaceholder('Selecciona el evento a replicar...')
    .addOptions(events.slice(0, 25).map(e => ({
      label: `#${e.id} ${e.activity_type}`,
      value: String(e.id),
      description: `${new Date(e.scheduled_at).toLocaleString('es-ES')} ${e.status === 'closed' ? '(cerrado)' : ''}`
    })));
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function removeFromEventParticipantsRows(eventId, participants) {
  if (!participants?.length) {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver (sin participantes)').setStyle(ButtonStyle.Secondary)
      )
    ];
  }
  const maxSelect = Math.min(25, participants.length);
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}remove_participant_select:${eventId}`)
    .setPlaceholder('Selecciona a quiénes quitar...')
    .setMinValues(1)
    .setMaxValues(maxSelect)
    .addOptions(participants.slice(0, 25).map((p, i) => ({
      label: (p.displayName || `Inscrito ${i + 1}`).slice(0, 100),
      value: p.user_id,
      description: p.displayName ? `ID: ${p.user_id.slice(-6)}` : `ID: ${p.user_id.slice(-6)}`
    })));
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function closeEventAttendeesRows(eventId, participants) {
  const maxSelect = Math.min(25, Math.max(1, participants?.length || 0));
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}close_attendees:${eventId}`)
    .setPlaceholder('Selecciona quienes asistieron...')
    .setMinValues(0)
    .setMaxValues(maxSelect);
  if (participants?.length > 0) {
    select.addOptions(participants.slice(0, 25).map((p, i) => ({
      label: (p.displayName || `Inscrito ${i + 1}`).slice(0, 100),
      value: p.user_id,
      ...(p.displayName ? {} : { description: `ID: ${p.user_id.slice(-6)}` })
    })));
  } else {
    select.addOptions([{ label: 'Sin inscritos', value: '_none', description: 'No hay participantes' }]);
  }
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}close_skip_attendees:${eventId}`).setLabel('Todos asistieron').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`${PREFIX}close_cancel_event:${eventId}`).setLabel('Cancelar evento').setStyle(ButtonStyle.Danger).setEmoji('🚫'),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function deductUserSelectRow() {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`${PREFIX}deduct_user_select`)
    .setPlaceholder('Selecciona el usuario...')
    .setMaxValues(1);
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function adjustPointsUserSelectRow() {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`${PREFIX}adjust_user_select`)
    .setPlaceholder('Selecciona el usuario...')
    .setMaxValues(1);
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function fundTypeRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`${PREFIX}fund_ingreso`).setLabel('Ingreso').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`${PREFIX}fund_egreso`).setLabel('Egreso').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`${PREFIX}leader_back`).setLabel('Volver').setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function createEventActivitySelect() {
  return new StringSelectMenuBuilder()
    .setCustomId(`${PREFIX}create_event_type`)
    .setPlaceholder('Tipo de actividad...')
    .addOptions([
      { label: 'Mazmorra', value: 'Mazmorra' },
      { label: 'Avalonian', value: 'Avalonian' },
      { label: 'ZvZ', value: 'ZvZ' },
      { label: 'Hellgate', value: 'Hellgate' },
      { label: 'Recolección', value: 'Recolección' },
      { label: 'Otro', value: 'Otro' }
    ]);
}

export { PREFIX };

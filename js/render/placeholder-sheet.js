// Временный макет листа. Рисуется, пока настоящий PNG не положен в Assets/Sheet/.
// Показывает рамки полей из раскладки, так что по нему видно, куда ляжет текст.

export function drawPlaceholderSheet(ctx, { sheet, layout, skills, derived = [], fontStack, note }) {
  const { width, height } = sheet;

  ctx.fillStyle = '#f2ead8';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#b8a984';
  ctx.lineWidth = 10;
  ctx.strokeRect(60, 60, width - 120, height - 120);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8c7e60';
  ctx.font = `700 96px ${fontStack}`;
  ctx.fillText('ЛИСТ ПЕРСОНАЖА', width / 2, 190);
  ctx.font = `400 44px ${fontStack}`;
  ctx.fillText(note, width / 2, 275);

  const fields = [
    ['Имя', layout.name],
    ...layout.archetypes.map((box, i) => [`Архетип ${i + 1}`, box]),
    ...skills.map((skill) => [skill.name, layout.skills[skill.id]]),
    ...derived.filter((def) => layout.derived?.[def.id]).map((def) => [def.name, layout.derived[def.id]]),
  ];

  ctx.lineWidth = 5;
  ctx.setLineDash([26, 16]);
  ctx.strokeStyle = '#a89a76';
  ctx.textAlign = 'left';
  ctx.font = `400 38px ${fontStack}`;
  for (const [label, box] of fields) {
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = '#8c7e60';
    ctx.fillText(label, box.x, box.y - 28);
  }
  ctx.setLineDash([]);
}

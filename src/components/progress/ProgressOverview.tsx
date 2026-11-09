import type { PracticeProgress, PracticeProgressDay } from "../../api/progress";

const difficultyLabels: Record<string, string> = { easy: "Начальные", medium: "Средние", hard: "Сложные" };

export function ProgressOverview({ progress, compact = false }: { progress: PracticeProgress; compact?: boolean }) {
  const maxSolved = Math.max(1, ...progress.byDifficulty.map((item) => item.solved));
  return <div className={`progress-overview${compact ? " progress-overview--compact" : ""}`}>
    <div className="progress-metrics" aria-label="Показатели практики">
      <Metric value={progress.score.toLocaleString("ru-RU")} label="очков практики" accent />
      <Metric value={String(progress.solvedTasks)} label="задач решено" />
      <Metric value={String(progress.attempts)} label="проверенных попыток" />
      <Metric value={`${progress.accuracyPercent}%`} label="успешных попыток" />
    </div>
    {!compact && <div className="progress-visuals">
      <section className="progress-panel" aria-labelledby="progress-activity-title">
        <div className="progress-panel__heading"><div><span className="section-kicker">Динамика</span><h2 id="progress-activity-title">Активность за 30 дней</h2></div><small>по UTC</small></div>
        <ActivityChart days={progress.daily} />
        <details className="progress-data"><summary>Показать данные по дням</summary>
          <div className="progress-data__scroll"><table aria-label="Данные активности по дням"><thead><tr><th scope="col">День</th><th scope="col">Попытки</th><th scope="col">Принято</th></tr></thead><tbody>
            {progress.daily.map((day) => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.attempts}</td><td>{day.accepted}</td></tr>)}
          </tbody></table></div>
        </details>
      </section>
      <section className="progress-panel" aria-labelledby="progress-difficulty-title">
        <div className="progress-panel__heading"><div><span className="section-kicker">Разбор</span><h2 id="progress-difficulty-title">Решено по сложности</h2></div></div>
        <div className="progress-difficulty">
          {progress.byDifficulty.map((item) => <div className="progress-difficulty__row" key={item.difficulty}>
            <div><span>{difficultyLabels[item.difficulty] ?? item.difficulty}</span><strong>{item.solved}</strong></div>
            <div className="progress-difficulty__track" aria-hidden="true"><span style={{ width: `${(item.solved / maxSolved) * 100}%` }} /></div>
          </div>)}
        </div>
        <p className="progress-explainer">Каждая задача учитывается один раз — по первой успешной версии.</p>
      </section>
    </div>}
    <p className="progress-explainer">Это статистика решённых задач и попыток, а не оценка освоения темы.</p>
  </div>;
}

function Metric({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return <div className={`progress-metric${accent ? " progress-metric--accent" : ""}`}><strong>{value}</strong><span>{label}</span></div>;
}

function ActivityChart({ days }: { days: PracticeProgressDay[] }) {
  const max = Math.max(1, ...days.map((day) => day.attempts));
  const width = Math.max(600, days.length * 19 + 24);
  return <div className="progress-chart-scroll">
    <svg role="img" aria-label="Активность за 30 дней: проверенные и принятые попытки" viewBox={`0 0 ${width} 148`} preserveAspectRatio="xMinYMid meet">
      <title>Активность за 30 дней</title>
      <desc>Каждый столбец — один день UTC. Тёмная часть показывает принятые попытки. Точные значения доступны в таблице ниже.</desc>
      <line x1="10" y1="126" x2={width - 10} y2="126" className="progress-chart-axis" />
      {days.map((day, index) => {
        const height = (day.attempts / max) * 104;
        const acceptedHeight = (day.accepted / max) * 104;
        const x = 12 + index * 19;
        return <g key={day.date}>
          <rect x={x} y={126 - Math.max(2, height)} width="12" height={Math.max(2, height)} rx="3" className="progress-chart-bar" />
          {day.accepted > 0 && <rect x={x} y={126 - acceptedHeight} width="12" height={acceptedHeight} rx="3" className="progress-chart-accepted" />}
        </g>;
      })}
      {days.length > 0 && <><text x="12" y="144" className="progress-chart-label">{days[0].date.slice(5)}</text><text x={width - 44} y="144" className="progress-chart-label">{days[days.length - 1].date.slice(5)}</text></>}
    </svg>
  </div>;
}
